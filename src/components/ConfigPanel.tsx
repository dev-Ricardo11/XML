import { FolderOpen, Settings2, FileSpreadsheet } from 'lucide-react';
import { Config } from '../types';

interface ConfigPanelProps {
  config: Config;
  onChange: (config: Config) => void;
}

export default function ConfigPanel({ config, onChange }: ConfigPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center gap-2 mb-6">
        <Settings2 className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-bold text-slate-800">Configuración de Rutas</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <FileSpreadsheet className="w-4 h-4" />
            Ruta del Archivo Excel
          </label>
          <input
            type="text"
            value={config.excelPath}
            onChange={(e) => onChange({ ...config, excelPath: e.target.value })}
            placeholder="C:\datos\facturas.xlsx"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Ruta completa del archivo Excel con los datos de facturación
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <FolderOpen className="w-4 h-4" />
            Carpeta de XMLs de Entrada
          </label>
          <input
            type="text"
            value={config.xmlInputPath}
            onChange={(e) => onChange({ ...config, xmlInputPath: e.target.value })}
            placeholder="C:\xml\entrada"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Carpeta donde están los archivos XML a procesar
          </p>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <FolderOpen className="w-4 h-4" />
            Carpeta de XMLs Corregidos
          </label>
          <input
            type="text"
            value={config.xmlOutputPath}
            onChange={(e) => onChange({ ...config, xmlOutputPath: e.target.value })}
            placeholder="C:\xml\salida"
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
          />
          <p className="mt-1 text-xs text-slate-500">
            Carpeta donde se guardarán los archivos XML procesados
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Instrucciones</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>1. Configura la ruta del archivo Excel</li>
          <li>2. Configura la carpeta de XMLs de entrada</li>
          <li>3. Configura la carpeta de salida</li>
          <li>4. Haz clic en "Procesar Archivos"</li>
          <li className="mt-2 font-semibold">• Las fechas y plan se obtienen automáticamente del Excel</li>
        </ul>
      </div>
    </div>
  );
}