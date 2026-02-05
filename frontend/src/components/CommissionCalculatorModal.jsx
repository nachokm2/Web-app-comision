import { useEffect, useMemo, useState } from 'react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { fetchProgramsCatalog } from '../services/api.js';

const templateUrl = '/templates/calculo_comisiones.csv';
const REVIEW_PAGE_SIZE = 12;
const mockCurrencyFormatter = new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0
});

function formatCurrency (value = 0) {
  return mockCurrencyFormatter.format(Math.max(0, Number(value) || 0));
}

function CommissionCalculatorModal ({ open, onClose, onConfirmed }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [error, setError] = useState(null);
  const [catalogError, setCatalogError] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [programs, setPrograms] = useState([]);
  const [loadingPrograms, setLoadingPrograms] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!open) {
      setSelectedFile(null);
      setRows([]);
      setError(null);
      setCatalogError(null);
      setSummary(null);
      setCurrentPage(0);
      setParsing(false);
      setUploading(false);
      return;
    }

    let cancelled = false;
    setLoadingPrograms(true);
    setCatalogError(null);
    fetchProgramsCatalog()
      .then((list) => {
        if (!cancelled) {
          setPrograms(Array.isArray(list) ? list : []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCatalogError(err.message || 'No pudimos obtener el catálogo de programas.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingPrograms(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  const programIndex = useMemo(() => buildProgramIndex(programs), [programs]);
  useEffect(() => {
    if (!rows.length) return;
    setRows((prev) => prev.map((row) => evaluateCalculationRow(row, programIndex)));
  }, [programIndex]);
  const sortedRows = useMemo(() => {
    const priority = { 'needs-review': 0, pending: 1, valid: 2 };
    return [...rows].sort((a, b) => {
      const diff = (priority[a.status] ?? 3) - (priority[b.status] ?? 3);
      if (diff !== 0) return diff;
      return (a.rowNumber || 0) - (b.rowNumber || 0);
    });
  }, [rows]);
  const totalPages = Math.max(1, Math.ceil(sortedRows.length / REVIEW_PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages - 1);
  const paginatedRows = sortedRows.slice(
    safePage * REVIEW_PAGE_SIZE,
    safePage * REVIEW_PAGE_SIZE + REVIEW_PAGE_SIZE
  );
  const pageStart = sortedRows.length ? safePage * REVIEW_PAGE_SIZE + 1 : 0;
  const pageEnd = sortedRows.length ? pageStart + paginatedRows.length - 1 : 0;

  useEffect(() => {
    setCurrentPage((prev) => {
      const maxPage = Math.max(0, Math.ceil(sortedRows.length / REVIEW_PAGE_SIZE) - 1);
      return Math.min(prev, maxPage);
    });
  }, [sortedRows.length]);

  if (!open) return null;

  const hasRows = rows.length > 0;
  const validCount = rows.filter((row) => row.status === 'valid').length;
  const pendingReview = rows.length - validCount;
  const canConfirm = hasRows && pendingReview === 0 && !uploading && !parsing;
  const statusMessage = hasRows
    ? `${validCount} listas · ${pendingReview} por corregir`
    : 'Selecciona un archivo para comenzar.';

  const resetSelection = () => {
    setSelectedFile(null);
    setRows([]);
    setError(null);
    setSummary(null);
    setCurrentPage(0);
  };

  const handleFileSelection = async (file) => {
    if (!file) {
      resetSelection();
      return;
    }

    const extension = (file.name?.split('.').pop() || '').toLowerCase();
    if (!['csv', 'xlsx'].includes(extension)) {
      setError('Solo se permiten archivos CSV o XLSX.');
      return;
    }

    setParsing(true);
    setError(null);
    setSummary(null);

    try {
      const parsedRecords = await parseCalculationFile(file);
      if (!parsedRecords.length) {
        throw new Error('La plantilla está vacía.');
      }
      if (parsedRecords.length > 500) {
        throw new Error('Máximo 500 filas por carga.');
      }
      const preparedRows = parsedRecords
        .map((record, index) => ({
          id: createRowId(index),
          rowNumber: getRowNumberFromRecord(record, index),
          data: mapCalculationRow(record),
          issues: [],
          status: 'pending',
          programMatch: null
        }))
        .filter((row) => !isCalculationRowEmpty(row.data));

      if (!preparedRows.length) {
        throw new Error('No encontramos datos válidos en el archivo.');
      }

      const evaluated = preparedRows.map((row) => evaluateCalculationRow(row, programIndex));
      setRows(evaluated);
      setSelectedFile(file);
      setCurrentPage(0);
    } catch (err) {
      setRows([]);
      setSelectedFile(null);
      setError(err.message || 'No pudimos leer el archivo.');
    } finally {
      setParsing(false);
    }
  };

  const handleInputChange = (event) => {
    const file = event.target.files?.[0];
    handleFileSelection(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    handleFileSelection(file);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleFieldChange = (rowId, field, value) => {
    setRows((prev) => prev.map((row) => {
      if (row.id !== rowId) return row;
      const nextData = { ...row.data, [field]: value };
      return evaluateCalculationRow({ ...row, data: nextData }, programIndex);
    }));
  };

  const handleProgramPicker = (rowId, programCode) => {
    if (!programCode) {
      handleFieldChange(rowId, 'codPrograma', '');
      return;
    }
    handleFieldChange(rowId, 'codPrograma', programCode);
  };

  const handleConfirmUpload = () => {
    if (!canConfirm) {
      setError('Todavía hay filas por corregir antes de confirmar.');
      return;
    }

    setUploading(true);
    setError(null);
    setTimeout(() => {
      const processedAt = new Date().toLocaleString('es-CL');
      const confirmedRows = rows.map((row, index) => ({
        id: row.id,
        order: index + 1,
        codPrograma: row.data.codPrograma,
        versionPrograma: row.data.versionPrograma || '1',
        monto: estimateCommissionAmount(row.data.codPrograma, index)
      }));
      const processedCount = confirmedRows.length;
      const fileName = selectedFile?.name || 'Carga contable';
      const totalAmount = confirmedRows.reduce((sum, item) => sum + item.monto, 0);
      resetSelection();
      const summaryData = {
        successCount: processedCount,
        processedAt,
        fileName,
        totalAmount,
        cases: confirmedRows
      };
      setSummary(summaryData);
      onConfirmed?.(summaryData);
      setUploading(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 px-4 py-6">
      <div className="w-full max-w-5xl max-h-[94vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-indigo-500">Calculo de Comisiones</p>
            <h3 className="text-2xl font-semibold text-slate-900">Valida los códigos antes de enviar</h3>
            <p className="mt-1 text-sm text-slate-500">Descarga la plantilla, completa los códigos y versiones y valida las coincidencias.</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-slate-400 transition hover:text-slate-600">✕</button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">1. Descarga la plantilla</p>
            <p className="mt-1 text-xs text-slate-500">Incluye los campos mínimos solicitados.</p>
            <a
              href={templateUrl}
              download
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              ⬇️ Descargar plantilla CSV
            </a>
          </div>

          <div
            className="rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center transition hover:border-slate-400"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <input
              id="calculator-upload-input"
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={handleInputChange}
            />
            <label htmlFor="calculator-upload-input" className="flex cursor-pointer flex-col items-center gap-2 text-sm text-slate-600">
              <span className="text-3xl">📂</span>
              {selectedFile ? (
                <>
                  <span className="font-semibold text-slate-900">{selectedFile.name}</span>
                  <span className="text-xs text-slate-500">{statusMessage}</span>
                </>
              ) : parsing ? (
                <>
                  <span className="font-semibold text-slate-900">Procesando archivo…</span>
                  <span className="text-xs text-slate-500">Estamos validando las filas.</span>
                </>
              ) : (
                <>
                  <span className="font-semibold text-slate-900">Arrastra tu archivo aquí</span>
                  <span className="text-xs text-slate-500">o haz clic para seleccionar la plantilla completa</span>
                </>
              )}
              <span className="text-[11px] text-slate-400">Formatos: CSV o XLSX · Máx 500 filas</span>
            </label>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
        )}

        {catalogError && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">{catalogError}</div>
        )}

        {summary && (
          <div className="mt-6 rounded-2xl border border-slate-200 p-4">
            <p className="text-sm font-semibold text-slate-700">Última confirmación</p>
            <div className="mt-2 grid gap-4 text-sm text-slate-600 md:grid-cols-3">
              <div>
                <p className="text-xs text-slate-400">Registros enviados</p>
                <p className="text-lg font-semibold text-emerald-600">{summary.successCount}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Fecha</p>
                <p className="text-base font-semibold text-slate-900">{summary.processedAt}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Archivo</p>
                <p className="text-base font-semibold text-slate-900">{summary.fileName}</p>
              </div>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-900">Monto estimado: {formatCurrency(summary.totalAmount)}</p>
            <p className="mt-3 text-xs text-slate-500">La integración contable procesará esta carga cuando el endpoint esté disponible.</p>
          </div>
        )}

        <div className="mt-6 rounded-3xl border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Revisión de códigos</p>
              <p className="text-xs text-slate-500">Corrige los que no tengan coincidencia antes de confirmar. {loadingPrograms ? 'Descargando catálogo…' : ''}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetSelection}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
              >
                Limpiar selección
              </button>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={handleConfirmUpload}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold text-white transition ${canConfirm ? 'bg-slate-900 hover:bg-slate-800' : 'bg-slate-400 cursor-not-allowed'}`}
              >
                {uploading ? 'Confirmando…' : 'Confirmar carga'}
              </button>
            </div>
          </div>

          <div className="max-h-[45vh] overflow-y-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2">Fila</th>
                  <th className="px-4 py-2">Código ingresado</th>
                  <th className="px-4 py-2">Versión</th>
                  <th className="px-4 py-2">Coincidencia</th>
                  <th className="px-4 py-2">Estado</th>
                  <th className="px-4 py-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 py-8 text-center text-sm text-slate-400">
                      Carga un archivo para comenzar la revisión.
                    </td>
                  </tr>
                ) : null}

                {paginatedRows.map((row) => (
                  <tr key={row.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500">#{row.rowNumber}</td>
                    <td className="px-4 py-3">
                      <input
                        value={row.data.codPrograma}
                        onChange={(event) => handleFieldChange(row.id, 'codPrograma', event.target.value.toUpperCase())}
                        placeholder="COD-000"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-mono text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        value={row.data.versionPrograma}
                        onChange={(event) => handleFieldChange(row.id, 'versionPrograma', event.target.value)}
                        placeholder="1"
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {row.programMatch ? (
                        <div className="rounded-xl border border-slate-200 px-3 py-2">
                          <p className="text-xs font-semibold text-emerald-600">{row.programMatch.cod_programa}</p>
                          <p className="text-xs text-slate-500">{row.programMatch.nombre}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Sin coincidencia</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AccountingRowStatusPill status={row.status} />
                      {row.issues.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-amber-600">
                          {row.issues.map((issue, idx) => (
                            <li key={idx}>{issue}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700"
                        value=""
                        onChange={(event) => handleProgramPicker(row.id, event.target.value)}
                      >
                        <option value="">Selecciona un código</option>
                        {programs.map((program) => (
                          <option key={program.cod_programa} value={program.cod_programa}>
                            {program.cod_programa} · {program.nombre}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedRows.length > REVIEW_PAGE_SIZE ? (
            <div className="flex flex-col items-center gap-2 border-t border-slate-100 px-4 py-3 text-xs text-slate-500 sm:flex-row sm:justify-between">
              <span>
                Mostrando {pageStart}-{pageEnd} de {sortedRows.length} filas
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
                  disabled={safePage === 0}
                  className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ← Anterior
                </button>
                <span className="text-[11px] text-slate-400">
                  Página {safePage + 1} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1))}
                  disabled={safePage >= totalPages - 1}
                  className="rounded-full border border-slate-200 px-3 py-1 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Siguiente →
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AccountingRowStatusPill ({ status }) {
  const tone = {
    valid: 'bg-emerald-100 text-emerald-700',
    'needs-review': 'bg-amber-100 text-amber-700',
    pending: 'bg-slate-100 text-slate-600'
  }[status || 'pending'];

  const label = {
    valid: 'Listo',
    'needs-review': 'Revisar',
    pending: 'Pendiente'
  }[status || 'pending'];

  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tone}`}>
      {label}
    </span>
  );
}

function createRowId (index = 0) {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${index}`;
}

function normalizeHeader (key) {
  return key?.toString().toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '') || '';
}

const ACCOUNTING_COLUMN_MAP = {
  codigoprograma: 'codPrograma',
  codprograma: 'codPrograma',
  codigo: 'codPrograma',
  programacodigo: 'codPrograma',
  versionprograma: 'versionPrograma',
  version: 'versionPrograma'
};

function mapCalculationRow (record = {}) {
  const mapped = Object.entries(record).reduce((acc, [key, value]) => {
    const target = ACCOUNTING_COLUMN_MAP[normalizeHeader(key)];
    if (!target) return acc;
    acc[target] = typeof value === 'string' ? value.trim() : value;
    return acc;
  }, {});

  return {
    codPrograma: (mapped.codPrograma || '').toString().toUpperCase(),
    versionPrograma: (mapped.versionPrograma || '').toString().trim()
  };
}

function isCalculationRowEmpty (rowData = {}) {
  return Object.values(rowData).every((value) => `${value ?? ''}`.trim() === '');
}

function getRowNumberFromRecord (record, index) {
  if (record && typeof record.__rowNum__ === 'number') {
    return record.__rowNum__ + 1;
  }
  if (record && typeof record.__rowNum === 'number') {
    return record.__rowNum + 1;
  }
  return index + 2;
}

function buildProgramIndex (catalog = []) {
  const byCode = new Map();
  catalog.forEach((program) => {
    if (program.cod_programa) {
      byCode.set(program.cod_programa.toUpperCase(), program);
    }
  });
  return byCode;
}

function evaluateCalculationRow (row, programIndex) {
  const issues = [];
  const code = row.data.codPrograma || '';
  const version = row.data.versionPrograma || '';
  const match = code ? programIndex.get(code) || null : null;

  if (!code) {
    issues.push('Código de programa es obligatorio.');
  } else if (!match) {
    issues.push('El código no existe en el catálogo.');
  }

  if (!version) {
    issues.push('Indica la versión del programa.');
  }

  const status = issues.length === 0 ? 'valid' : 'needs-review';

  return {
    ...row,
    issues,
    status,
    programMatch: match
  };
}

function parseCalculationFile (file) {
  const extension = (file.name?.split('.').pop() || '').toLowerCase();
  if (extension === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: 'greedy',
        complete: (result) => resolve(result.data || []),
        error: (err) => reject(err)
      });
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        resolve(json);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('No pudimos leer el archivo XLSX.'));
    reader.readAsArrayBuffer(file);
  });
}

function estimateCommissionAmount (code = '', index = 0) {
  const hash = code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const base = 75000 + ((hash + index * 137) % 5) * 10000;
  return base;
}

export default CommissionCalculatorModal;
