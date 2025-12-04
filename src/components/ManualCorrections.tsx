import { Plus, X, Search, Type } from 'lucide-react';
import { CustomCorrection } from '../types';

interface ManualCorrectionsProps {
    corrections: CustomCorrection[];
    onCorrectionsChange: (corrections: CustomCorrection[]) => void;
}

function ManualCorrections({ corrections, onCorrectionsChange }: ManualCorrectionsProps) {
    const addCorrection = () => {
        const newCorrection: CustomCorrection = {
            id: Date.now().toString(),
            searchText: '',
            replaceText: '',
            description: '',
            enabled: true
        };
        onCorrectionsChange([...corrections, newCorrection]);
    };

    const removeCorrection = (id: string) => {
        onCorrectionsChange(corrections.filter(c => c.id !== id));
    };

    const updateCorrection = (id: string, field: keyof CustomCorrection, value: any) => {
        onCorrectionsChange(
            corrections.map(c => c.id === id ? { ...c, [field]: value } : c)
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">Correcciones Manuales</h2>
                        <p className="text-slate-600 text-sm mt-1">
                            Define búsquedas y reemplazos específicos que se aplicarán a todos los XML
                        </p>
                    </div>
                    <button
                        onClick={addCorrection}
                        className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" />
                        Agregar Corrección
                    </button>
                </div>

                {/* Examples */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Ejemplos de uso:</h3>
                    <div className="space-y-1 text-sm text-blue-800">
                        <p>• Cambiar cualquier texto específico en el XML</p>
                    </div>
                </div>
            </div>

            {/* Corrections List */}
            {corrections.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-lg">No hay correcciones configuradas</p>
                    <p className="text-slate-400 text-sm mt-1">Haz clic en "Agregar Corrección" para comenzar</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {corrections.map((correction, index) => (
                        <div
                            key={correction.id}
                            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-violet-100 rounded-lg">
                                        <Type className="w-5 h-5 text-violet-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-slate-800">Corrección #{index + 1}</h3>
                                        <label className="flex items-center gap-2 mt-1">
                                            <input
                                                type="checkbox"
                                                checked={correction.enabled}
                                                onChange={(e) => updateCorrection(correction.id, 'enabled', e.target.checked)}
                                                className="w-4 h-4 text-violet-600 rounded focus:ring-violet-500"
                                            />
                                            <span className="text-sm text-slate-600">Habilitada</span>
                                        </label>
                                    </div>
                                </div>
                                <button
                                    onClick={() => removeCorrection(correction.id)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">
                                        Descripción (opcional)
                                    </label>
                                    <input
                                        type="text"
                                        value={correction.description}
                                        onChange={(e) => updateCorrection(correction.id, 'description', e.target.value)}
                                        placeholder="Ej: Cambiar fecha del sector salud"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            <Search className="w-4 h-4 inline mr-1" />
                                            Buscar (texto a reemplazar)
                                        </label>
                                        <textarea
                                            value={correction.searchText}
                                            onChange={(e) => updateCorrection(correction.id, 'searchText', e.target.value)}
                                            placeholder="2025-11-25"
                                            rows={3}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            <Type className="w-4 h-4 inline mr-1" />
                                            Reemplazar con (nuevo texto)
                                        </label>
                                        <textarea
                                            value={correction.replaceText}
                                            onChange={(e) => updateCorrection(correction.id, 'replaceText', e.target.value)}
                                            placeholder="2025-12-01"
                                            rows={3}
                                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent font-mono text-sm"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Info */}
            {corrections.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <p className="text-sm text-amber-800">
                        <strong>ℹ️ Nota:</strong> Estas correcciones se aplicarán automáticamente a todos los archivos XML después del procesamiento principal.
                    </p>
                </div>
            )}
        </div>
    );
}

export default ManualCorrections;
