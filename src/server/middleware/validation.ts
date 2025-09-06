import { Request, Response, NextFunction } from 'express';

export const validateCallInitiate = (req: Request, res: Response, next: NextFunction): void => {
  const { fromPhone, toPhone } = req.body;

  if (!fromPhone || !toPhone) {
    res.status(400).json({
      success: false,
      error: 'Both fromPhone and toPhone are required'
    });
    return;
  }

  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(fromPhone) || !phoneRegex.test(toPhone)) {
    res.status(400).json({
      success: false,
      error: 'Invalid phone number format'
    });
    return;
  }

  if (fromPhone === toPhone) {
    res.status(400).json({
      success: false,
      error: 'From and To phone numbers cannot be the same'
    });
    return;
  }

  next();
};
