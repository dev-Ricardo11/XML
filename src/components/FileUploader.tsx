import { Upload, FileSpreadsheet, FileCode } from 'lucide-react';

interface FileUploaderProps {
  onExcelUpload: (file: File) => void;
  onXmlUpload: (files: File[]) => void;
  excelCount: number;
  xmlCount: number;
}

export default function FileUploader({ onExcelUpload, onXmlUpload, excelCount, xmlCount }: FileUploaderProps) {
  const handleExcelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onExcelUpload(file);
    }
  };

  const handleXmlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onXmlUpload(files);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-md p-6 border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors">
        <label className="flex flex-col items-center cursor-pointer">
          <FileSpreadsheet className="w-12 h-12 text-green-600 mb-3" />
          <span className="text-lg font-semibold text-slate-700 mb-2">
            Subir Archivo Excel
          </span>
          <span className="text-sm text-slate-500 mb-4">
            Debe contener columnas: NIT, FACTURA, FECHA_INICIO, FECHA_FIN, PLAN, ITEM
          </span>
          {excelCount > 0 && (
            <span className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium">
              {excelCount} registros cargados
            </span>
          )}
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleExcelChange}
            className="hidden"
          />
        </label>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 border-2 border-dashed border-slate-200 hover:border-blue-400 transition-colors">
        <label className="flex flex-col items-center cursor-pointer">
          <FileCode className="w-12 h-12 text-blue-600 mb-3" />
          <span className="text-lg font-semibold text-slate-700 mb-2">
            Subir Archivos XML
          </span>
          <span className="text-sm text-slate-500 mb-4">
            Selecciona múltiples archivos XML para procesar
          </span>
          {xmlCount > 0 && (
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-medium">
              {xmlCount} archivos XML cargados
            </span>
          )}
          <input
            type="file"
            accept=".xml"
            multiple
            onChange={handleXmlChange}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}