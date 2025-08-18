import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '@/config/database';
import { authenticateToken, generateToken, generateRefreshToken, verifyRefreshToken } from '@/middleware/auth';
import { 
  userRegistrationSchema, 
  userLoginSchema, 
  userProfileUpdateSchema,
  validate,
  ValidationError 
} from '@openenglishtutor/shared/validations';

const router = Router();

// Register new user
router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = validate(userRegistrationSchema, req.body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (existingUser) {
      res.status(400).json({
        success: false,
        error: 'User with this email already exists'
      });
      return;
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validatedData.password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        passwordHash,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    res.status(201).json({
      success: true,
      data: {
        user,
        token,
        refreshToken
      },
      message: 'User registered successfully'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: (error as ValidationError).getFieldErrors()
      });
      return;
    }

    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
});

// Login user
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const validatedData = validate(userLoginSchema, req.body);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(validatedData.password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
      return;
    }

    // Generate tokens
    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);

    // Return user data without password hash
    const { passwordHash, ...userWithoutPassword } = user;

    res.json({
      success: true,
      data: {
        user: userWithoutPassword,
        token,
        refreshToken
      },
      message: 'Login successful'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: (error as ValidationError).getFieldErrors()
      });
      return;
    }

    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
});

// Refresh token
router.post('/refresh', async (req: Request, res: Response): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
      return;
    }

    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      res.status(401).json({
        success: false,
        error: 'Invalid refresh token'
      });
      return;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    // Generate new tokens
    const newToken = generateToken(user);
    const newRefreshToken = generateRefreshToken(user);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Get user with progress data
    const userWithProgress = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true,
        progress: {
          include: {
            examType: true,
            skill: true
          }
        }
      }
    });

    if (!userWithProgress) {
      res.status(404).json({
        success: false,
        error: 'User not found'
      });
      return;
    }

    res.json({
      success: true,
      data: userWithProgress
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

// Update user profile
router.put('/profile', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'User not authenticated'
      });
      return;
    }

    // Validate request body
    const validatedData = validate(userProfileUpdateSchema, req.body);

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: validatedData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        preferredLanguage: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: (error as ValidationError).getFieldErrors()
      });
      return;
    }

    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Profile update failed'
    });
  }
});

// Logout (client-side token removal, but we can add token blacklisting later)
router.post('/logout', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    // For now, logout is handled client-side by removing the token
    // In the future, we can implement token blacklisting here
    
    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

export default router;