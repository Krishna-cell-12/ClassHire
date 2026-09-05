import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';
import { AppError } from '../lib/AppError';

type Target = 'body' | 'query' | 'params';

export function validate(schema: ZodTypeAny, target: Target = 'body') {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req[target] = schema.parse(req[target]);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(AppError.badRequest(JSON.stringify(err.flatten().fieldErrors), 'VALIDATION_ERROR'));
      }
      next(err);
    }
  };
}
