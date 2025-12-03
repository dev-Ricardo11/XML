import { Download, FileCheck } from 'lucide-react';
import { ProcessedXML } from '../types';

interface ProcessedFilesProps {
  files: ProcessedXML[];
  onDownloadAll: () => void;
}

export default function ProcessedFiles({ files, onDownloadAll }: ProcessedFilesProps) {
  const handleDownload = (file: ProcessedXML) => {
    const blob = new Blob([file.content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileCheck className="w-6 h-6 text-green-600" />
          <h3 className="text-xl font-bold text-slate-800">
            Archivos Procesados ({files.length})
          </h3>
        </div>
        <button
          onClick={onDownloadAll}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Download className="w-4 h-4" />
          Descargar Todos
        </button>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {files.map((file) => (
          <div
            key={file.sequence}
            className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full text-sm font-bold">
                {file.sequence}
              </span>
              <span className="text-sm font-medium text-slate-700">
                {file.filename}
              </span>
            </div>
            <button
              onClick={() => handleDownload(file)}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="Descargar archivo"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}