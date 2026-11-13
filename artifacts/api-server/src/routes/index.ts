import { Router, type IRouter } from "express";
import healthRouter from "./health";
import publicContentRouter from "./public-content";
import communityRouter from "./community";

const router: IRouter = Router();

router.use(healthRouter);
router.use(publicContentRouter);
router.use(communityRouter);

export default router;
