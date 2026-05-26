/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { Plus, Trash2, Printer, Upload, Download, Building2, User, Calendar, DollarSign, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { QuoteItem, ClientInfo, DEFAULT_ITEMS, DocumentType, VatType } from './types';

export default function App() {
  const isPrintMode = new URLSearchParams(window.location.search).get('print') === 'true';

  const [docType, setDocType] = useState<DocumentType>('quote');
  const [vatType, setVatType] = useState<VatType>('exclude');
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    manager: '',
    email: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [items, setItems] = useState<QuoteItem[]>(DEFAULT_ITEMS);
  const [sealImage, setSealImage] = useState<string | null>("https://i.ibb.co/Hf904Tb2/seal.png");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [previewScale, setPreviewScale] = useState(1);

  useEffect(() => {
    if (!previewContainerRef.current) return;
    
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      // A4 size in pixels at 96 DPI: 794 x 1123
      const scaleX = (width - 64) / 794; // 32px padding on each side
      const scaleY = (height - 64) / 1123; // 32px padding on top/bottom
      const scale = Math.min(scaleX, scaleY, 1);
      setPreviewScale(scale);
    });
    
    observer.observe(previewContainerRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isPrintMode) {
      let data: any = null;
      try {
        if (window.opener && (window.opener as any).printData) {
          data = (window.opener as any).printData;
        } else {
          const local = localStorage.getItem('printData');
          if (local) data = JSON.parse(local);
        }
      } catch (e) {
        console.error('Failed to load print data', e);
      }

      if (data) {
        if (data.docType) setDocType(data.docType);
        if (data.vatType) setVatType(data.vatType);
        if (data.clientInfo) setClientInfo(data.clientInfo);
        if (data.items) setItems(data.items);
        if (data.sealImage !== undefined) setSealImage(data.sealImage);
      }
    }
  }, [isPrintMode]);

  const handleOpenNewWindow = () => {
    const data = { docType, vatType, clientInfo, items, sealImage };
    (window as any).printData = data;
    
    try {
      localStorage.setItem('printData', JSON.stringify(data));
    } catch (e) {
      console.warn('localStorage quota exceeded', e);
    }
    
    window.open(window.location.pathname + '?print=true', '_blank');
  };

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Math.random().toString(36).substr(2, 9),
      description: '',
      quantity: 1,
      unitPrice: 0,
      note: '',
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSealUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSealImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const calculateVat = () => {
    const subtotal = calculateSubtotal();
    return vatType === 'exclude' ? Math.floor(subtotal * 0.1) : 0;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const vat = calculateVat();
    return subtotal + vat;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const handlePrint = () => {
    const originalTitle = document.title;
    const clientName = clientInfo.name ? `_${clientInfo.name}` : '';
    const docName = docType === 'quote' ? '견적서' : '거래명세서';
    document.title = `${docName}_올댓플레이${clientName}_${clientInfo.date}`;
    
    window.focus();
    window.print();
    
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    
    const currentScale = previewScale;
    setPreviewScale(1);
    
    // Wait for the scale to reset
    await new Promise(resolve => setTimeout(resolve, 100));
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const clientName = clientInfo.name ? `_${clientInfo.name}` : '';
      const docName = docType === 'quote' ? '견적서' : '거래명세서';
      pdf.save(`${docName}_올댓플레이${clientName}_${clientInfo.date}.pdf`);
    } catch (error) {
      console.error('PDF generation failed', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setPreviewScale(currentScale);
    }
  };

  const pageContent = (
    <div id="pdf-content" className="a4-page font-sans text-zinc-900 !m-0 flex flex-col relative overflow-hidden bg-white shrink-0">
      {/* Header */}
      <div className="flex justify-between items-start border-b-4 border-zinc-900 pb-8 mb-12">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 mb-2">
            {docType === 'quote' ? '견 적 서' : '거래명세서'}
          </h1>
          <p className="text-zinc-500 font-medium uppercase">
            {docType === 'quote' ? 'QUOTATION' : 'TRANSACTION STATEMENT'}
          </p>
        </div>
        <div className="text-right space-y-1">
          <p className="text-2xl font-bold text-indigo-600">올댓플레이</p>
          <div className="relative inline-block">
            <p className="text-sm font-semibold">대표이사 김상완</p>
            {sealImage && (
              <img 
                src={sealImage} 
                alt="Seal" 
                className="absolute -right-10 -top-4 w-16 h-16 object-contain opacity-80 pointer-events-none"
              />
            )}
          </div>
          <div className="text-[10px] text-zinc-500 leading-tight mt-4">
            <p>사업자등록번호: 399-08-01899</p>
            <p>주소: 서울시 중구 청계천로 40, 707호</p>
            <p>연락처: 010-5095-6004 | allthatplay@kakao.com</p>
          </div>
        </div>
      </div>

      {/* Client Info */}
      <div className="grid grid-cols-2 gap-12 mb-12">
        <div className="space-y-4">
          <div className="border-b border-zinc-200 pb-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">수신 (To)</p>
            <p className="text-xl font-bold whitespace-nowrap">{clientInfo.name || '고객사명 미입력'} 귀하</p>
          </div>
          <div className="border-b border-zinc-200 pb-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">담당자 (Attention)</p>
            <p className="font-semibold">{clientInfo.manager || '담당자 미입력'}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="border-b border-zinc-200 pb-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">일자 (Date)</p>
            <p className="font-semibold">{clientInfo.date}</p>
          </div>
          <div className="border-b border-zinc-200 pb-2">
            <p className="text-[10px] font-bold text-zinc-400 uppercase mb-1">이메일 (Email)</p>
            <p className="font-semibold">{clientInfo.email || '이메일 미입력'}</p>
          </div>
        </div>
      </div>

      {/* Total Amount */}
      <div className="bg-zinc-900 text-white p-6 rounded-xl mb-12 flex justify-between items-center">
        <span className="text-sm font-medium opacity-70">총 합계 금액 (Total Amount)</span>
        <div className="text-right">
          <span className="text-3xl font-black">{formatCurrency(calculateTotal())}</span>
          <p className="text-[10px] mt-1 opacity-50">
            (공급가액: {formatCurrency(calculateSubtotal())} / 부가세: {formatCurrency(calculateVat())})
          </p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-12 border-collapse">
        <thead>
          <tr className="border-b-2 border-zinc-900 text-left">
            <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase w-12 text-center">No</th>
            <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase">품명 및 규격</th>
            <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase w-16 text-center">수량</th>
            <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase text-right">단가</th>
            <th className="py-3 text-[10px] font-bold text-zinc-400 uppercase text-right">금액</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id} className="border-b border-zinc-100">
              <td className="py-4 text-sm text-center text-zinc-400">{index + 1}</td>
              <td className="py-4">
                <p className="font-bold text-sm">{item.description || '항목명 미입력'}</p>
                {item.note && <p className="text-[10px] text-zinc-400 mt-0.5">{item.note}</p>}
              </td>
              <td className="py-4 text-sm text-center font-medium">{item.quantity}</td>
              <td className="py-4 text-sm text-right font-medium">{formatCurrency(item.unitPrice)}</td>
              <td className="py-4 text-sm text-right font-bold">{formatCurrency(item.quantity * item.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Footer Notes */}
      <div className="mt-auto pt-12 border-t border-zinc-100">
        <h3 className="text-[10px] font-bold text-zinc-400 uppercase mb-4">비고 및 안내사항 (Notes)</h3>
        <ul className="text-[11px] text-zinc-500 space-y-1.5 list-disc pl-4">
          <li>본 {docType === 'quote' ? '견적서' : '거래명세서'}는 부가세(VAT) {vatType === 'exclude' ? '별도' : '포함'} 금액입니다.</li>
          {docType === 'quote' && <li>교육 일정 및 장소는 상호 협의 하에 조정 가능합니다.</li>}
          <li>교통비는 서울, 경기 외 지역의 경우 추가로 청구 될 수 있습니다.</li>
          <li>입금 계좌: 신한은행 100-035-288683 (예금주: 올댓플레이 김상완)</li>
        </ul>
      </div>

      {/* Bottom Brand */}
      <div className="absolute bottom-12 left-20 right-20 flex justify-between items-end opacity-20 grayscale pointer-events-none">
        <p className="text-xs font-black tracking-widest uppercase">ALL THAT PLAY</p>
        <p className="text-[10px]">Corporate Training & Development</p>
      </div>
    </div>
  );

  if (isPrintMode) {
    return (
      <div className="min-h-screen bg-zinc-200 flex flex-col items-center justify-center overflow-hidden print:block print:bg-white print:overflow-visible">
        <div 
          ref={previewContainerRef}
          className="w-full h-full flex items-center justify-center print:block print:w-auto print:h-auto"
        >
          <div 
            style={{ 
              '--preview-scale': previewScale,
              transform: 'scale(var(--preview-scale))', 
              transformOrigin: 'center center'
            } as React.CSSProperties}
            className="shadow-2xl flex-shrink-0 transition-transform duration-75 origin-center print-no-scale print:shadow-none print:m-0 print:p-0"
          >
            {pageContent}
          </div>
        </div>
        
        {/* Floating Print Button for New Window */}
        <div className="fixed bottom-8 right-8 flex gap-4 z-50 no-print">
          <button
            onClick={handleDownloadPdf}
            className="bg-indigo-600 text-white px-6 py-4 rounded-full font-bold flex items-center gap-2 shadow-2xl hover:bg-indigo-700 transition-transform hover:scale-105"
          >
            <Download className="w-5 h-5" /> PDF 저장
          </button>
          <button
            onClick={handlePrint}
            className="bg-zinc-900 text-white px-6 py-4 rounded-full font-bold flex items-center gap-2 shadow-2xl hover:bg-zinc-800 transition-transform hover:scale-105"
          >
            <Printer className="w-5 h-5" /> 인쇄하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-100 py-8 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Input Form Section */}
        <div className="no-print space-y-6">
          <header className="mb-8">
            <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">올댓플레이 문서 생성기</h1>
            <p className="text-zinc-500 mt-2 text-sm">전문적인 기업교육 견적서 및 거래명세서를 쉽고 빠르게 작성하세요.</p>
          </header>

          {/* Document & VAT Selectors */}
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              문서 설정
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">문서 종류</label>
                <div className="flex bg-zinc-100 p-1 rounded-xl">
                  <button
                    onClick={() => setDocType('quote')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${docType === 'quote' ? 'bg-white shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    견적서
                  </button>
                  <button
                    onClick={() => setDocType('statement')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${docType === 'statement' ? 'bg-white shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    거래명세서
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">부가세 설정</label>
                <div className="flex bg-zinc-100 p-1 rounded-xl">
                  <button
                    onClick={() => setVatType('exclude')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${vatType === 'exclude' ? 'bg-white shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    별도
                  </button>
                  <button
                    onClick={() => setVatType('include')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${vatType === 'include' ? 'bg-white shadow-sm text-indigo-600' : 'text-zinc-500 hover:text-zinc-700'}`}
                  >
                    포함
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              고객 정보
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">고객사명</label>
                <input
                  type="text"
                  placeholder="예: (주)구글코리아"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={clientInfo.name}
                  onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">담당자</label>
                <input
                  type="text"
                  placeholder="예: 홍길동 팀장"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={clientInfo.manager}
                  onChange={(e) => setClientInfo({ ...clientInfo, manager: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">담당자 이메일</label>
                <input
                  type="email"
                  placeholder="예: manager@example.com"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">일자</label>
                <input
                  type="date"
                  className="w-full px-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={clientInfo.date}
                  onChange={(e) => setClientInfo({ ...clientInfo, date: e.target.value })}
                />
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-indigo-600" />
                항목 입력
              </h2>
              <button
                onClick={addItem}
                className="text-sm bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-medium hover:bg-indigo-100 transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> 항목 추가
              </button>
            </div>
            
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {items.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-4 bg-zinc-50 rounded-xl border border-zinc-100 space-y-3 relative group"
                  >
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-6">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">항목명</label>
                        <input
                          type="text"
                          className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1 text-sm"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">수량</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1 text-sm"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-4">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">단가</label>
                        <input
                          type="number"
                          className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1 text-sm"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="col-span-12">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase mb-1 block">비고</label>
                        <input
                          type="text"
                          placeholder="특이사항 입력"
                          className="w-full bg-white border border-zinc-200 rounded-md px-2 py-1 text-sm"
                          value={item.note}
                          onChange={(e) => updateItem(item.id, 'note', e.target.value)}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              도장 날인
            </h2>
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-zinc-200 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/30 transition-all"
            >
              {sealImage ? (
                <img src={sealImage} alt="Seal" className="h-24 object-contain" />
              ) : (
                <>
                  <Upload className="w-8 h-8 text-zinc-300 mb-2" />
                  <p className="text-sm text-zinc-500 font-medium text-center">도장 이미지를 업로드하세요<br/><span className="text-xs font-normal">(PNG 권장, 배경 투명)</span></p>
                </>
              )}
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleSealUpload}
              />
            </div>
          </section>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
            >
              <Printer className="w-5 h-5" /> 인쇄
            </button>
            <button
              onClick={handleDownloadPdf}
              className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Download className="w-5 h-5" /> PDF 저장
            </button>
            <button
              onClick={handleOpenNewWindow}
              className="px-6 bg-white text-zinc-700 border border-zinc-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-50 transition-all shadow-sm"
              title="새 창에서 열기"
            >
              <ExternalLink className="w-5 h-5" /> 새 창
            </button>
          </div>
        </div>

        {/* Preview Section */}
        <div 
          ref={previewContainerRef}
          className="relative flex flex-col h-[calc(100vh-4rem)] lg:sticky lg:top-8 bg-zinc-200 rounded-2xl overflow-hidden border border-zinc-300 items-center justify-center"
        >
          <div 
            style={{ 
              '--preview-scale': previewScale,
              transform: 'scale(var(--preview-scale))', 
              transformOrigin: 'center center'
            } as React.CSSProperties}
            className="shadow-2xl flex-shrink-0 transition-transform duration-75 origin-center print-no-scale"
          >
            {pageContent}
          </div>
        </div>
      </div>
    </div>
  );
}
