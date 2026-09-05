import { Request, Response, NextFunction } from 'express';
import { searchStudentsNaturalLanguage, NlSearchError } from './nlSearch.service';

export async function search(req: Request, res: Response, next: NextFunction) {
  try {
    const { query, page, limit } = req.body;
    const result = await searchStudentsNaturalLanguage(query, page, limit);
    res.json(result);
  } catch (err) {
    if (err instanceof NlSearchError) {
      return res.status(422).json({
        error: "Couldn't understand that query, try rephrasing.",
        code: err.code,
        attempted: err.attempted,
      });
    }
    next(err);
  }
}
