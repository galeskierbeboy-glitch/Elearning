import jwt from 'jsonwebtoken';
import { auth } from '../middleware/auth.js';

describe('Auth Middleware', () => {
  let mockReq;
  let mockRes;
  let nextFunction = jest.fn();

  beforeEach(() => {
    mockReq = {
      header: jest.fn()
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  it('should fail if no token is provided', () => {
    mockReq.header.mockReturnValue(null);
    
    auth(mockReq, mockRes, nextFunction);
    
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({ 
      message: 'No authentication token, access denied' 
    });
  });

  it('should set user in request object if valid token', () => {
    const user = { id: 1, email: 'test@example.com' };
    const token = jwt.sign(user, process.env.JWT_SECRET);
    mockReq.header.mockReturnValue(`Bearer ${token}`);
    
    auth(mockReq, mockRes, nextFunction);
    
    expect(mockReq.user).toBeDefined();
    expect(nextFunction).toHaveBeenCalled();
  });
});