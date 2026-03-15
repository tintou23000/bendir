import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Search, Download, User, GraduationCap, Calendar, FileSpreadsheet, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import * as XLSX from 'xlsx';

// Types
interface Student {
  id: string;
  lastName: string;
  firstName: string;
  dob: string;
  activities: string;
  test: string;
  exam: string;
  remarks: string;
  className: string;
}

export default function App() {
  const [view, setView] = useState<'student' | 'admin'>('student');
  const [studentsData, setStudentsData] = useState<Student[]>([]);
  
  // Student State
  const [searchId, setSearchId] = useState('');
  const [searchDob, setSearchDob] = useState('');
  const [searchResult, setSearchResult] = useState<Student | null>(null);
  const [error, setError] = useState('');

  // Admin State
  const [parsedData, setParsedData] = useState<Student[]>([]);

  useEffect(() => {
    // Load data.json on mount
    fetch('/data.json')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setStudentsData(data);
        }
      })
      .catch(err => console.error('Error loading data.json:', err));
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearchResult(null);

    if (!searchId || !searchDob) {
      setError('يرجى إدخال رقم التعريف وتاريخ الميلاد.');
      return;
    }

    const result = studentsData.find(
      s => s.id === searchId.trim() && s.dob === searchDob.trim()
    );

    if (result) {
      setSearchResult(result);
    } else {
      setError('لم يتم العثور على التلميذ. يرجى التأكد من صحة المعلومات المدخلة.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        let allStudents: Student[] = [];

        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          // raw: false ensures we get the formatted string (e.g. 2013-09-16)
          const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, raw: false, dateNF: 'yyyy-mm-dd' });

          // Find header row
          let headerIdx = -1;
          for (let i = 0; i < Math.min(20, jsonData.length); i++) {
            const row = jsonData[i];
            if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && cell.includes('رقم التعريف'))) {
              headerIdx = i;
              break;
            }
          }

          if (headerIdx !== -1) {
            const headers = jsonData[headerIdx];
            const colMap = {
              id: headers.findIndex((h: any) => typeof h === 'string' && h.includes('رقم التعريف')),
              lastName: headers.findIndex((h: any) => typeof h === 'string' && h.includes('اللقب')),
              firstName: headers.findIndex((h: any) => typeof h === 'string' && h.includes('الاسم')),
              dob: headers.findIndex((h: any) => typeof h === 'string' && h.includes('تاريخ الميلاد')),
              activities: headers.findIndex((h: any) => typeof h === 'string' && h.includes('تقويم النشاطات')),
              test: headers.findIndex((h: any) => typeof h === 'string' && h.includes('الفرض')),
              exam: headers.findIndex((h: any) => typeof h === 'string' && h.includes('الإختبار')),
              remarks: headers.findIndex((h: any) => typeof h === 'string' && h.includes('التقديرات')),
            };

            for (let i = headerIdx + 1; i < jsonData.length; i++) {
              const row = jsonData[i];
              if (row && row[colMap.id]) {
                // Normalize date format to YYYY-MM-DD if possible, or just use raw string
                let dobStr = row[colMap.dob] ? String(row[colMap.dob]).trim() : '';
                
                // Simple normalization if it comes as DD/MM/YYYY
                if (dobStr.includes('/')) {
                   const parts = dobStr.split('/');
                   if (parts.length === 3 && parts[2].length === 4) {
                      dobStr = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                   }
                }

                allStudents.push({
                  id: String(row[colMap.id]).trim(),
                  lastName: row[colMap.lastName] || '',
                  firstName: row[colMap.firstName] || '',
                  dob: dobStr,
                  activities: row[colMap.activities] || '',
                  test: row[colMap.test] || '',
                  exam: row[colMap.exam] || '',
                  remarks: row[colMap.remarks] || '',
                  className: sheetName
                });
              }
            }
          }
        });

        setParsedData(allStudents);
      } catch (err) {
        console.error("Error parsing Excel:", err);
        alert("حدث خطأ أثناء قراءة الملف. يرجى التأكد من أنه ملف إكسل صالح.");
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-emerald-700 text-white shadow-md">
        <div className="max-w-4xl mx-auto px-4 py-6 text-center">
          <h1 className="text-2xl font-bold mb-2">الجمهورية الجزائرية الديمقراطية الشعبية</h1>
          <h2 className="text-xl font-semibold opacity-90">وزارة التربية الوطنية</h2>
          <div className="mt-4 inline-flex items-center gap-2 bg-emerald-800/50 px-4 py-2 rounded-full text-sm">
            <GraduationCap className="w-5 h-5" />
            <span>فضاء التلميذ للاطلاع على النتائج</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8">
        {view === 'student' ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto space-y-6"
          >
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">البحث عن النتائج</h3>
              
              <form onSubmit={handleSearch} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">رقم التعريف المدرسي</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={searchId}
                      onChange={(e) => setSearchId(e.target.value)}
                      className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500 text-left"
                      placeholder="مثال: 1001323011454300"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">تاريخ الميلاد</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                      <Calendar className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="date"
                      value={searchDob}
                      onChange={(e) => setSearchDob(e.target.value)}
                      className="block w-full pr-10 pl-3 py-3 border border-gray-300 rounded-xl focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-3 px-4 rounded-xl font-bold transition-colors"
                >
                  <Search className="w-5 h-5" />
                  عرض النتيجة
                </button>
              </form>
            </div>

            {/* Result Card */}
            {searchResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl shadow-lg border border-emerald-100 overflow-hidden"
              >
                <div className="bg-emerald-50 px-6 py-4 border-b border-emerald-100">
                  <h4 className="text-lg font-bold text-emerald-800">كشف النقاط</h4>
                  <p className="text-sm text-emerald-600 font-medium mt-1">
                    التلميذ(ة): {searchResult.firstName} {searchResult.lastName} | القسم: {searchResult.className}
                  </p>
                </div>
                
                <div className="p-6">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-700">معدل تقويم النشاطات</span>
                      <span className="font-bold text-lg text-gray-900">{searchResult.activities} / 20</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-700">الفرض</span>
                      <span className="font-bold text-lg text-gray-900">{searchResult.test} / 20</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-700">الإختبار</span>
                      <span className="font-bold text-lg text-gray-900">{searchResult.exam} / 20</span>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <span className="block text-sm text-gray-500 mb-1">التقديرات</span>
                      <span className="block font-bold text-emerald-700 text-lg">{searchResult.remarks}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Lock className="w-6 h-6 text-emerald-600" />
                لوحة تحكم الأستاذ
              </h3>
              <button 
                onClick={() => setView('student')}
                className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1"
              >
                العودة للموقع <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-800 text-sm leading-relaxed">
                <p className="font-bold mb-2">خطوات تحديث البيانات على GitHub:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>قم برفع ملف الإكسل (Excel) الذي يحتوي على النقاط.</li>
                  <li>اضغط على زر "تحميل ملف data.json".</li>
                  <li>اذهب إلى مستودع GitHub الخاص بك.</li>
                  <li>قم برفع الملف <code className="bg-blue-100 px-1 rounded">data.json</code> داخل مجلد <code className="bg-blue-100 px-1 rounded">public</code> واستبدل الملف القديم.</li>
                </ol>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="excel-upload"
                />
                <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center">
                  <FileSpreadsheet className="w-12 h-12 text-emerald-500 mb-4" />
                  <span className="text-lg font-semibold text-gray-700">اختر ملف الإكسل</span>
                  <span className="text-sm text-gray-500 mt-1">صيغة .xlsx أو .xls</span>
                </label>
              </div>

              {parsedData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                    <div className="text-emerald-800">
                      <span className="font-bold text-lg">{parsedData.length}</span> تلميذ تم استخراج بياناتهم بنجاح.
                    </div>
                    <button
                      onClick={handleDownloadJson}
                      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                      <Download className="w-5 h-5" />
                      تحميل data.json
                    </button>
                  </div>
                  
                  <div className="max-h-64 overflow-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm text-right">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 border-b">الرقم</th>
                          <th className="px-4 py-2 border-b">الاسم واللقب</th>
                          <th className="px-4 py-2 border-b">القسم</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.slice(0, 50).map((s, i) => (
                          <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                            <td className="px-4 py-2" dir="ltr">{s.id}</td>
                            <td className="px-4 py-2">{s.firstName} {s.lastName}</td>
                            <td className="px-4 py-2">{s.className}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {parsedData.length > 50 && (
                      <div className="text-center py-2 text-gray-500 text-xs bg-gray-50">
                        يتم عرض أول 50 تلميذ فقط...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-gray-500 text-sm">
        <p>جميع الحقوق محفوظة &copy; {new Date().getFullYear()}</p>
        {view === 'student' && (
          <button 
            onClick={() => setView('admin')}
            className="mt-4 opacity-30 hover:opacity-100 transition-opacity"
            title="لوحة تحكم الأستاذ"
          >
            <Lock className="w-4 h-4" />
          </button>
        )}
      </footer>
    </div>
  );
}
