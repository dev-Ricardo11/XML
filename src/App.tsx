import { useState, useRef } from 'react';
import { Settings, FileText, Upload, FileSpreadsheet, FolderOpen, FileX2, CheckCircle, Wrench } from 'lucide-react';
import * as XLSX from 'xlsx';
import ManualCorrections from './components/ManualCorrections';
import { processXMLFiles, applyCustomCorrections } from './utils/xmlProcessor';
import { ExcelData, ProcessedXML, CustomCorrection } from './types';

type TabType = 'processor' | 'corrections';

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('processor');
  const [excelData, setExcelData] = useState<ExcelData[]>([]);
  const [xmlFiles, setXmlFiles] = useState<File[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedXML[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [outputDirectory, setOutputDirectory] = useState<FileSystemDirectoryHandle | null>(null);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [customCorrections, setCustomCorrections] = useState<CustomCorrection[]>([]);

  const excelInputRef = useRef<HTMLInputElement>(null);
  const xmlInputRef = useRef<HTMLInputElement>(null);

  const handleSelectOutputDirectory = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const dirHandle = await (window as any).showDirectoryPicker({
          mode: 'readwrite'
        });
        setOutputDirectory(dirHandle);
      } else {
        alert('Tu navegador no soporta la selección de carpetas. Usa Chrome o Edge.');
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error seleccionando carpeta:', error);
      }
    }
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

      console.log('Primera fila del Excel:', jsonData[0]);
      console.log('Columnas disponibles:', Object.keys(jsonData[0] || {}));

      const excelDateToJSDate = (serial: any): string => {
        if (!serial) return '';
        if (typeof serial === 'string' && (serial.includes('-') || serial.includes('/'))) return serial;

        const parsed = parseFloat(serial);
        if (!isNaN(parsed)) {
          const date = new Date(Math.round((parsed - 25569) * 86400 * 1000));
          const userTimezoneOffset = date.getTimezoneOffset() * 60000;
          const adjustedDate = new Date(date.getTime() + userTimezoneOffset);
          return adjustedDate.toISOString().split('T')[0];
        }
        return String(serial);
      };

      const parsedData: ExcelData[] = jsonData.map((row) => {
        const result = {
          nit: String(row.NIT || row.nit || row.Nit || row.numFactura || ''),
          factura: String(row.numFactura || row.Factura || row.FACTURA || row.factura || ''),
          fechaInicio: excelDateToJSDate(row.inicio || row.Inicio || row['Fecha Inicio'] || row.FechaInicio || row.FECHA_INICIO || row.fecha_inicio),
          fechaFin: excelDateToJSDate(row.fin || row.Fin || row['Fecha Fin'] || row.FechaFin || row.FECHA_FIN || row.fecha_fin),
          plan: String(row['plan de beneficios'] || row.Plan || row.PLAN || row.plan || row.plan_de_beneficios || ''),
          item: String(row.Item || row.Items || row.ITEM || row.item || row.idMIPRES || '').toLowerCase()
        };

        return result;
      });

      console.log('Primera fila procesada:', parsedData[0]);
      console.log('Datos procesados:', parsedData);
      setExcelData(parsedData);
    } catch (error) {
      console.error('Error leyendo Excel:', error);
      alert('Error al leer el archivo Excel: ' + (error as Error).message);
    }
  };

  const handleXmlUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setXmlFiles(files);
  };

  const handleProcess = async () => {
    if (!excelData.length || !xmlFiles.length) {
      alert('Por favor sube el Excel y los archivos XML');
      return;
    }

    setIsProcessing(true);
    try {
      // Process with excel data and custom corrections
      let processed = await processXMLFiles(xmlFiles, excelData, customCorrections);

      // Apply manual corrections to the final XML strings
      const enabledCorrections = customCorrections.filter(c => c.enabled);
      if (enabledCorrections.length > 0) {
        console.log(`Aplicando ${enabledCorrections.length} correcciones manuales a los archivos procesados...`);
        processed = processed.map(file => ({
          ...file,
          content: applyCustomCorrections(file.content, customCorrections)
        }));
      }

      setProcessedFiles(processed);

      if (outputDirectory) {
        await saveFilesToDirectory(processed, outputDirectory);
        alert(`✓ ${processed.length} archivos guardados exitosamente en la carpeta seleccionada`);
      }
    } catch (error) {
      console.error('Error procesando archivos:', error);
      alert('Error al procesar archivos: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const saveFilesToDirectory = async (files: ProcessedXML[], dirHandle: FileSystemDirectoryHandle) => {
    for (const file of files) {
      try {
        const fileHandle = await dirHandle.getFileHandle(file.filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(file.content);
        await writable.close();
      } catch (error) {
        console.error(`Error guardando ${file.filename}:`, error);
        throw error;
      }
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-700 to-purple-700 bg-clip-text text-transparent">
              Procesador de Facturas XML
            </h1>
          </div>
          <p className="text-slate-600 text-base pl-14">
            Procesa y corrige archivos XML de facturación electrónica masivamente
          </p>
        </header>

        {/* Tabs */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-2 inline-flex gap-2">
            <button
              onClick={() => setActiveTab('processor')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'processor'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Settings className="w-4 h-4" />
              Procesador Principal
            </button>
            <button
              onClick={() => setActiveTab('corrections')}
              className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${activeTab === 'corrections'
                  ? 'bg-violet-600 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-50'
                }`}
            >
              <Wrench className="w-4 h-4" />
              Correcciones Manuales
              {customCorrections.filter(c => c.enabled).length > 0 && (
                <span className="bg-orange-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {customCorrections.filter(c => c.enabled).length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'processor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">
              {/* File Upload Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
                {/* Excel Upload */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <FileSpreadsheet className="w-4 h-4 text-red-500" />
                    Archivo Excel
                  </label>
                  <input
                    ref={excelInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => excelInputRef.current?.click()}
                    className="w-full px-5 py-3.5 border-2 border-dashed border-violet-300 rounded-xl hover:border-violet-400 hover:bg-violet-50 transition-all text-violet-700 font-medium flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Seleccionar archivo
                  </button>
                  {excelData.length > 0 && (
                    <p className="mt-3 text-sm text-green-600 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-semibold">{excelData.length} registros cargados</span>
                    </p>
                  )}
                </div>

                {/* XML Upload */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                    <FileX2 className="w-4 h-4 text-orange-500" />
                    Archivos XML
                  </label>
                  <input
                    ref={xmlInputRef}
                    type="file"
                    accept=".xml"
                    multiple
                    onChange={handleXmlUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => xmlInputRef.current?.click()}
                    className="w-full px-5 py-3.5 border-2 border-dashed border-orange-300 rounded-xl hover:border-orange-400 hover:bg-orange-50 transition-all text-orange-700 font-medium flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" />
                    Elegir archivos
                  </button>
                  {xmlFiles.length > 0 && (
                    <p className="mt-3 text-sm text-orange-600 flex items-center gap-2">
                      <span className="font-semibold">{xmlFiles.length} archivos XML seleccionados</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Processed Data Badge */}
              {processedFiles.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <span className="text-lg font-semibold text-slate-800">
                        Datos procesados ({processedFiles.length})
                      </span>
                    </div>
                    <button
                      onClick={handleDownloadAll}
                      className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors"
                    >
                      Descargar Todos
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Output Directory */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Carpeta de Salida
                </h3>
                <button
                  onClick={handleSelectOutputDirectory}
                  className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <FolderOpen className="w-4 h-4" />
                  {outputDirectory ? 'Cambiar Carpeta' : 'Cambiar Carpeta'}
                </button>
                {outputDirectory && (
                  <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm text-green-700 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span className="font-medium">Carpeta seleccionada válida</span>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      Los archivos serán guardados automáticamente en esta carpeta
                    </p>
                  </div>
                )}
              </div>

              {/* Automatic Processing Info */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Procesamiento Automático
                </h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-start gap-2">
                    <span className="text-violet-600 font-bold mt-0.5">•</span>
                    <p>Las <strong>fechas</strong> se obtienen del Excel para "Servicio" y del XML para "Tiquete"</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-violet-600 font-bold mt-0.5">•</span>
                    <p>El <strong>plum de beneficios</strong> se extrae automáticamente del Excel</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-violet-600 font-bold mt-0.5">•</span>
                    <p>Los XML se procesan sin configuración manual</p>
                  </div>
                  {customCorrections.filter(c => c.enabled).length > 0 && (
                    <div className="flex items-start gap-2 mt-4 pt-3 border-t border-slate-200">
                      <span className="text-orange-600 font-bold mt-0.5">✓</span>
                      <p className="text-orange-700"><strong>{customCorrections.filter(c => c.enabled).length} correcciones manuales</strong> activas</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Process Button */}
              <button
                onClick={handleProcess}
                disabled={isProcessing || !excelData.length || !xmlFiles.length}
                className="w-full bg-gradient-to-r from-violet-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl hover:from-violet-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg flex items-center justify-center gap-2"
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
        ) : (
          <ManualCorrections
            corrections={customCorrections}
            onCorrectionsChange={setCustomCorrections}
          />
        )}

        {/* Excel Data Table - Only show in processor tab */}
        {activeTab === 'processor' && excelData.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-5">
              Datos del Excel <span className="text-violet-600">({excelData.length} registros)</span>
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-violet-900">NIT</th>
                    <th className="px-6 py-4 text-left font-semibold text-violet-900">Factura</th>
                    <th className="px-6 py-4 text-left font-semibold text-violet-900">Fecha Inicio</th>
                    <th className="px-6 py-4 text-left font-semibold text-violet-900">Fecha Fin</th>
                    <th className="px-6 py-4 text-left font-semibold text-violet-900">Plan</th>
                    <th className="px-6 py-4 text-left font-semibold text-violet-900">Item</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {excelData.slice(0, 10).map((row, idx) => (
                    <tr key={idx} className="hover:bg-violet-50/30 transition-colors">
                      <td className="px-6 py-3 text-slate-700">{row.nit}</td>
                      <td className="px-6 py-3 text-slate-700">{row.factura}</td>
                      <td className="px-6 py-3 text-slate-700">{row.fechaInicio}</td>
                      <td className="px-6 py-3 text-slate-700">{row.fechaFin}</td>
                      <td className="px-6 py-3 text-violet-700 font-medium">{row.plan}</td>
                      <td className="px-6 py-3 text-slate-700 capitalize">{row.item}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {excelData.length > 10 && (
                <p className="text-center text-sm text-slate-500 mt-4 py-2">
                  Mostrando 10 de {excelData.length} registros
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;