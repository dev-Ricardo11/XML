import { useState } from 'react';
import { Settings, FileText } from 'lucide-react';
import * as XLSX from 'xlsx';
import FileUploader from './components/FileUploader';
import ConfigPanel from './components/ConfigPanel';
import ProcessedFiles from './components/ProcessedFiles';
import { processXMLFiles } from './utils/xmlProcessor';
import { ExcelData, ProcessedXML, Config } from './types';

function App() {
  const [config, setConfig] = useState<Config>({
    fecha: '',
    planBeneficio: '0'
  });
  const [excelData, setExcelData] = useState<ExcelData[]>([]);
  const [xmlFiles, setXmlFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedXML[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleExcelUpload = async (file: File) => {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

    const parsedData: ExcelData[] = jsonData.map((row) => ({
      nit: String(row.NIT || row.nit || ''),
      factura: String(row.FACTURA || row.factura || ''),
      fechaInicio: String(row.FECHA_INICIO || row.fecha_inicio || row.FechaInicio || ''),
      fechaFin: String(row.FECHA_FIN || row.fecha_fin || row.FechaFin || ''),
      plan: String(row.PLAN || row.plan || ''),
      item: String(row.ITEM || row.item || '').toLowerCase()
    }));

    setExcelData(parsedData);
  };

  const handleXmlUpload = (files: File[]) => {
    setXmlFiles(files);
  };

  const handleProcess = async () => {
    if (!excelData.length || !xmlFiles.length) {
      alert('Por favor sube el Excel y los archivos XML');
      return;
    }

    if (!config.fecha) {
      alert('Por favor selecciona una fecha');
      return;
    }

    setIsProcessing(true);
    try {
      const processed = await processXMLFiles(xmlFiles, excelData, config);
      setProcessedFiles(processed);
    } catch (error) {
      console.error('Error procesando archivos:', error);
      alert('Error al procesar archivos: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadAll = () => {
    processedFiles.forEach((file) => {
      const blob = new Blob([file.content], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-10 h-10 text-blue-600" />
            <h1 className="text-4xl font-bold text-slate-800">
              Procesador de Facturas XML
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Procesa y corrige archivos XML de facturación electrónica
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 space-y-6">
            <FileUploader
              onExcelUpload={handleExcelUpload}
              onXmlUpload={handleXmlUpload}
              excelCount={excelData.length}
              xmlCount={xmlFiles.length}
            />

            {processedFiles.length > 0 && (
              <ProcessedFiles
                files={processedFiles}
                onDownloadAll={handleDownloadAll}
              />
            )}
          </div>

          <div className="space-y-6">
            <ConfigPanel
              config={config}
              onChange={setConfig}
            />

            <button
              onClick={handleProcess}
              disabled={isProcessing || !excelData.length || !xmlFiles.length}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <Settings className="w-5 h-5" />
                  Procesar Archivos
                </>
              )}
            </button>
          </div>
        </div>

        {excelData.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">
              Datos del Excel ({excelData.length} registros)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">NIT</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Factura</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha Inicio</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha Fin</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Plan</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {excelData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-600">{row.nit}</td>
                      <td className="px-4 py-3 text-slate-600">{row.factura}</td>
                      <td className="px-4 py-3 text-slate-600">{row.fechaInicio}</td>
                      <td className="px-4 py-3 text-slate-600">{row.fechaFin}</td>
                      <td className="px-4 py-3 text-slate-600">{row.plan}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          row.item === 'servicio' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {row.item}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;