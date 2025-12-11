import { Router } from "express";
import * as localesController from "../controllers/locales.controller.js";

const router = Router();

router.get("/countries", localesController.listCountries);

export default router;
