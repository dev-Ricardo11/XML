import { Calendar, Settings2 } from 'lucide-react';
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
        <h2 className="text-xl font-bold text-slate-800">Configuración</h2>
      </div>

      <div className="space-y-4">
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
            <Calendar className="w-4 h-4" />
            Fecha
          </label>
          <input
            type="date"
            value={config.fecha}
            onChange={(e) => onChange({ ...config, fecha: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="mt-1 text-xs text-slate-500">
            Fecha que se aplicará en el procesamiento
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Plan Beneficio
          </label>
          <select
            value={config.planBeneficio}
            onChange={(e) => onChange({ ...config, planBeneficio: e.target.value })}
            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="0">Plan 0</option>
            <option value="1">Plan 1</option>
            <option value="2">Plan 2</option>
            <option value="3">Plan 3</option>
          </select>
          <p className="mt-1 text-xs text-slate-500">
            Selecciona el plan de beneficio a aplicar
          </p>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">Instrucciones</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>1. Sube el archivo Excel con los datos</li>
          <li>2. Sube los archivos XML a procesar</li>
          <li>3. Configura la fecha y plan beneficio</li>
          <li>4. Haz clic en "Procesar Archivos"</li>
        </ul>
      </div>
    </div>
  );
}