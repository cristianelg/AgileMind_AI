import csvDemo from "../../dados/itens_demo.csv?raw";
import { parseCsv } from "./parseCsv.js";

// Dados demonstrativos. Estado em memória, sem armazenamento do navegador.
export const ITENS_DEMO = parseCsv(csvDemo);
export const TIMES = [...new Set(ITENS_DEMO.map((i) => i.time))];
