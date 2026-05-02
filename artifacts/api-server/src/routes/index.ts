import { Router, type IRouter } from "express";
import healthRouter from "./health";
import plaidRouter from "./plaid";
import erasRouter from "./eras";

const router: IRouter = Router();

router.use(healthRouter);
router.use(plaidRouter);
router.use(erasRouter);

export default router;
