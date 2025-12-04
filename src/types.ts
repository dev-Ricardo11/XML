export interface Config {
  excelPath: string;
  xmlInputPath: string;
  xmlOutputPath: string;
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

export interface CustomCorrection {
  id: string;
  searchText: string;
  replaceText: string;
  description: string;
  enabled: boolean;
}