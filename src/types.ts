export interface Config {
  fecha: string;
  planBeneficio: string;
}

export interface ExcelData {
  nit: string;
  factura: string;
  fechaInicio: string;
  fechaFin: string;
  plan: string;
  item: string;
}

export interface ProcessedXML {
  filename: string;
  content: string;
  sequence: number;
}