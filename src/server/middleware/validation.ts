import { Request, Response, NextFunction } from 'express';

export const validateCallInitiate = (req: Request, res: Response, next: NextFunction): void => {
  const { fromPhone, toPhone, callMode = 'bridge' } = req.body;

  if (callMode === 'bridge') {
    if (!fromPhone || !toPhone) {
      res.status(400).json({
        success: false,
        error: 'Both fromPhone and toPhone are required for bridge calls'
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
  } else if (callMode === 'headset') {
    if (!toPhone) {
      res.status(400).json({
        success: false,
        error: 'toPhone is required for headset calls'
      });
      return;
    }

    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(toPhone)) {
      res.status(400).json({
        success: false,
        error: 'Invalid phone number format'
      });
      return;
    }
  } else {
    res.status(400).json({
      success: false,
      error: 'Invalid callMode. Must be "bridge" or "headset"'
    });
    return;
  }

  next();
};
