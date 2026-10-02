import React, { useState, useRef } from 'react';
import Papa from 'papaparse';
import { X, UploadCloud, AlertCircle, FileSpreadsheet, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Account, Category } from '../types.ts';
import { apiFetch, notifyDataChanged } from '../utils.tsx';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  categories: Category[];
}

type Step = 'UPLOAD' | 'MAP' | 'REVIEW' | 'SUCCESS';

export const CsvImportModal: React.FC<CsvImportModalProps> = ({ isOpen, onClose, accounts, categories }) => {
  const [step, setStep] = useState<Step>('UPLOAD');
  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Column Mapping
  const [dateField, setDateField] = useState('');
  const [amountField, setAmountField] = useState('');
  const [descField, setDescField] = useState('');
  const [typeField, setTypeField] = useState('');

  // Global Mapping
  const [globalAccount, setGlobalAccount] = useState<string>('');
  const [globalCategory, setGlobalCategory] = useState<string>('');

  const [importedCount, setImportedCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.data.length === 0) {
          setError('CSV file appears to be empty.');
          return;
        }
        setHeaders(results.meta.fields || Object.keys(results.data[0] || {}));
        setCsvData(results.data);
        setStep('MAP');
      },
      error: (err: any) => {
        setError(err.message || 'Failed to parse CSV');
      }
    });
  };

  const handleImport = async () => {
    if (!dateField || !amountField) {
      setError('Date and Amount fields are strictly required.');
      return;
    }
    if (!globalAccount) {
      setError('You must select a target account for the imported transactions.');
      return;
    }
    if (!globalCategory) {
      setError('You must select a default category for the imported transactions.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = csvData.map((row) => {
      const rawType = typeField ? row[typeField] : '';
      let parsedType = 'EXPENSE';
      if (rawType && (rawType.toUpperCase().includes('CREDIT') || rawType.toUpperCase().includes('INCOME') || rawType.toUpperCase() === 'CR')) {
        parsedType = 'INCOME';
      }

      // Sometimes amount in CSV is negative for expense. 
      const rawAmount = parseFloat((row[amountField] || '0').replace(/[^0-9.-]+/g, ""));
      const amount = Math.abs(rawAmount);

      if (rawAmount > 0 && !typeField) {
        parsedType = 'INCOME';
      }

      // Try basic date parsing or just pass the string if it's ISO compatible. We'll format to YYYY-MM-DD
      let isoDate = new Date().toISOString();
      try {
        if (row[dateField]) {
          isoDate = new Date(row[dateField]).toISOString();
        }
      } catch (e) { }

      return {
        date: isoDate,
        amount: amount,
        type: parsedType,
        description: row[descField] || 'Imported Transaction',
        account_id: globalAccount,
        category_id: globalCategory,
        payment_method: 'OTHER',
      };
    });

    try {
      const res = await apiFetch('/api/transactions/bulk', {
        method: 'POST',
        body: JSON.stringify({ transactions: payload })
      });
      setImportedCount(res.count);
      setStep('SUCCESS');
      notifyDataChanged();
    } catch (err: any) {
      setError(err.message || 'Failed to import transactions.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep('UPLOAD');
    setCsvData([]);
    setHeaders([]);
    setError(null);
    setDateField('');
    setAmountField('');
    setDescField('');
    setTypeField('');
    setGlobalAccount('');
    setGlobalCategory('');
    setImportedCount(0);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        onClick={() => step !== 'SUCCESS' && onClose()}
      />
      <div className="relative w-full max-w-xl bg-[#FFFFFF] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-[#D9D9D4]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-white flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111111] tracking-tight">Bulk Import CSV</h2>
              <p className="text-xs text-[#6B6B67] mt-0.5">Import transactions from your bank statements.</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-[#6B6B67] hover:bg-[#F5F5F3] hover:text-[#111111] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto">
          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium leading-relaxed">{error}</span>
            </div>
          )}

          {step === 'UPLOAD' && (
            <div className="py-8">
              <div 
                className="border-2 border-dashed border-[#D9D9D4] hover:border-[#111111] bg-[#F9F9F8] rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-colors cursor-pointer group"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="w-14 h-14 bg-[#EBEBE7] group-hover:bg-[#111111] group-hover:text-white rounded-2xl flex items-center justify-center text-[#6B6B67] mb-4 transition-colors">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-[#111111] mb-1">Click to Upload CSV</h3>
                <p className="text-xs text-[#6B6B67] max-w-xs leading-relaxed">
                  Export a standard CSV file from your bank and upload it here to bulk import records.
                </p>
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
              </div>
            </div>
          )}

          {step === 'MAP' && (
            <div className="space-y-6">
              <div className="bg-[#F5F5F3] border border-[#D9D9D4] rounded-xl p-4 text-xs text-[#111111]">
                <strong>{csvData.length} rows detected.</strong> Please map your CSV columns to the required fields.
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">1. Column Mapping</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">Date Column *</label>
                    <select value={dateField} onChange={e => setDateField(e.target.value)} className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs focus:border-[#111111] outline-none">
                      <option value="">Select Column...</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">Amount Column *</label>
                    <select value={amountField} onChange={e => setAmountField(e.target.value)} className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs focus:border-[#111111] outline-none">
                      <option value="">Select Column...</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">Description Column</label>
                    <select value={descField} onChange={e => setDescField(e.target.value)} className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs focus:border-[#111111] outline-none">
                      <option value="">None (Use Default)</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">Type Column (Optional)</label>
                    <select value={typeField} onChange={e => setTypeField(e.target.value)} className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs focus:border-[#111111] outline-none">
                      <option value="">Auto-detect from Amount</option>
                      {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-[#D9D9D4]">
                <h4 className="text-xs font-bold text-[#111111] uppercase tracking-wider">2. Global Overrides</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">Target Account *</label>
                    <select value={globalAccount} onChange={e => setGlobalAccount(e.target.value)} className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs focus:border-[#111111] outline-none">
                      <option value="">Select Account...</option>
                      {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-semibold text-[#6B6B67] block mb-1">Default Category *</label>
                    <select value={globalCategory} onChange={e => setGlobalCategory(e.target.value)} className="w-full py-2 px-3 bg-[#FFFFFF] border border-[#D9D9D4] rounded-xl text-xs focus:border-[#111111] outline-none">
                      <option value="">Select Category...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 'SUCCESS' && (
            <div className="py-10 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-[#111111] mb-2">Import Complete!</h3>
              <p className="text-sm text-[#6B6B67] max-w-sm">
                Successfully processed and imported <strong>{importedCount}</strong> transactions into your account.
              </p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-5 sm:p-6 border-t border-[#D9D9D4] bg-[#F9F9F8] flex items-center justify-between">
          {step === 'SUCCESS' ? (
            <button 
              onClick={onClose}
              className="w-full px-5 py-2.5 bg-[#111111] hover:bg-[#333333] text-white rounded-xl text-sm font-semibold transition-all shadow-xs"
            >
              Done
            </button>
          ) : (
            <>
              <button 
                onClick={step === 'MAP' ? reset : onClose}
                className="px-5 py-2.5 bg-[#FFFFFF] hover:bg-[#F5F5F3] border border-[#D9D9D4] text-[#111111] rounded-xl text-sm font-semibold transition-colors"
                disabled={loading}
              >
                {step === 'MAP' ? 'Back' : 'Cancel'}
              </button>
              
              {step === 'MAP' && (
                <button 
                  onClick={handleImport}
                  disabled={loading || !dateField || !amountField || !globalAccount || !globalCategory}
                  className="px-5 py-2.5 bg-[#111111] hover:bg-[#333333] text-white rounded-xl text-sm font-semibold transition-all shadow-xs flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Importing...' : 'Start Import'}
                  {!loading && <ArrowRight className="w-4 h-4 ml-2" />}
                </button>
              )}
            </>
          )}
        </div>

      </div>
    </div>
  );
};
