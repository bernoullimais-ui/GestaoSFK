
import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  User, 
  DollarSign, 
  TrendingDown, 
  Activity, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Search,
  Filter,
  Check
} from 'lucide-react';
import { Aluno, Turma, Matricula } from '../types';

interface FinanceiroProps {
  alunos: Aluno[];
  turmas: Turma[];
  matriculas: Matricula[];
}

const Financeiro: React.FC<FinanceiroProps> = ({ alunos, turmas, matriculas }) => {
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [professoresSelecionados, setProfessoresSelecionados] = useState<string[]>([]);
  const [viewType, setViewType] = useState<'professor' | 'unidade' | 'detalhado'>('professor');
  const [isProfOpen, setIsProfOpen] = useState(false);

  const normalizeText = (t: any) => 
    String(t || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, ' ').trim();

  const parseToDate = (dateVal: any): Date | null => {
    if (!dateVal || String(dateVal).trim() === '' || String(dateVal).toLowerCase() === 'null') return null;
    try {
      let s = String(dateVal).trim().toLowerCase();
      s = s.split(',')[0].trim();
      const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
      if (dmyMatch) {
        const day = parseInt(dmyMatch[1]);
        const month = parseInt(dmyMatch[2]);
        let year = parseInt(dmyMatch[3]);
        if (year < 100) year += (year < 50 ? 2000 : 1900);
        return new Date(year, month - 1, day);
      }
      const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (isoMatch) return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3]));
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) { return null; }
  };

  const unidadesUnicas = useMemo(() => Array.from(new Set(turmas.map(t => t.unidade).filter(Boolean))).sort(), [turmas]);
  const professoresUnicos = useMemo(() => Array.from(new Set(turmas.map(t => t.professor).filter(Boolean))).sort(), [turmas]);

  const stats = useMemo(() => {
    const start = parseToDate(dataInicio);
    const end = parseToDate(dataFim);
    if (!start || !end) return { items: [], summary: { bruto: 0, descontos: 0, liquido: 0, count: 0, discountCount: 0 } };

    // Mapear e-mails duplicados para desconto de 10%
    const emailCounts: Record<string, number> = {};
    alunos.forEach(a => {
      const email = normalizeText(a.email);
      if (email && email !== '') {
        const activeMats = matriculas.filter(m => m.alunoId === a.id);
        if (activeMats.length > 0) {
          emailCounts[email] = (emailCounts[email] || 0) + activeMats.length;
        }
      }
    });

    const items: any[] = [];
    let totalBruto = 0, totalDescontos = 0, totalLiquido = 0, countMensalidades = 0, countDescontos = 0;

    matriculas.forEach(m => {
      const aluno = alunos.find(a => a.id === m.alunoId);
      if (!aluno) return;

      const studentCourseName = normalizeText(m.turmaId.split('-')[0]);
      const studentUnit = normalizeText(m.unidade);

      // Busca por vínculo ID ou por proximidade de nome na mesma unidade
      const turma = turmas.find(t => 
        t.id === m.turmaId || 
        (normalizeText(t.unidade) === studentUnit && (
          normalizeText(t.nome) === studentCourseName ||
          normalizeText(t.nome).includes(studentCourseName) ||
          studentCourseName.includes(normalizeText(t.nome))
        ))
      );
      
      if (!turma) return;

      const emailAluno = normalizeText(aluno.email);
      const temDesconto = emailAluno && emailCounts[emailAluno] > 1;
      const vBase = turma.valorMensal || 0;
      const vDesconto = temDesconto ? vBase * 0.10 : 0;
      const motivo = temDesconto ? "Fidelidade (E-mail Duplicado 10%)" : "--";

      const dMat = parseToDate(m.dataMatricula);
      if (!dMat) return;

      let currPayDate = new Date(dMat);
      // Iterar meses para projeção financeira
      while (currPayDate <= end) {
        const dCanc = parseToDate(aluno.dataCancelamento);
        if (dCanc && currPayDate > dCanc) break;

        if (currPayDate >= start && currPayDate <= end) {
          if (filtroUnidade && normalizeText(turma.unidade) !== normalizeText(filtroUnidade)) { 
            currPayDate.setMonth(currPayDate.getMonth() + 1); 
            continue; 
          }
          if (professoresSelecionados.length > 0 && !professoresSelecionados.includes(turma.professor)) { 
            currPayDate.setMonth(currPayDate.getMonth() + 1); 
            continue; 
          }

          items.push({
            estudante: aluno.nome,
            unidade: turma.unidade,
            turma: turma.nome,
            professor: turma.professor,
            vBruto: vBase,
            vDesconto: vDesconto,
            vLiquido: vBase - vDesconto,
            motivo,
            vencimento: new Date(currPayDate)
          });

          totalBruto += vBase;
          totalDescontos += vDesconto;
          totalLiquido += (vBase - vDesconto);
          countMensalidades++;
          if (temDesconto) countDescontos++;
        }
        currPayDate.setMonth(currPayDate.getMonth() + 1);
        if (currPayDate.getFullYear() > end.getFullYear() + 2) break; // Trava de segurança
      }
    });

    return { 
      items: items.sort((a, b) => {
        const d = a.vencimento.getTime() - b.vencimento.getTime();
        if (d !== 0) return d;
        return a.estudante.localeCompare(b.estudante);
      }), 
      summary: { bruto: totalBruto, descontos: totalDescontos, liquido: totalLiquido, count: countMensalidades, discountCount: countDescontos } 
    };
  }, [alunos, matriculas, turmas, dataInicio, dataFim, filtroUnidade, professoresSelecionados]);

  const resumoProfessor = useMemo(() => {
    const map: Record<string, any> = {};
    stats.items.forEach(it => {
      if (!map[it.professor]) map[it.professor] = { nome: it.professor, bruto: 0, count: 0, liquido: 0 };
      map[it.professor].bruto += it.vBruto;
      map[it.professor].liquido += it.vLiquido;
      map[it.professor].count++;
    });
    return Object.values(map).sort((a:any, b:any) => a.nome.localeCompare(b.nome));
  }, [stats]);

  const resumoUnidade = useMemo(() => {
    const map: Record<string, any> = {};
    stats.items.forEach(it => {
      if (!map[it.unidade]) map[it.unidade] = { nome: it.unidade, bruto: 0, count: 0, liquido: 0 };
      map[it.unidade].bruto += it.vBruto;
      map[it.unidade].liquido += it.vLiquido;
      map[it.unidade].count++;
    });
    return Object.values(map).sort((a:any, b:any) => a.nome.localeCompare(b.nome));
  }, [stats]);

  const handleExport = () => {
    const headers = ["Estudante", "Unidade", "Turma", "Professor", "Vencimento", "Valor Bruto", "Desconto", "Motivo", "Liquido"];
    const rows = stats.items.map(it => [it.estudante, it.unidade, it.turma, it.professor, it.vencimento.toLocaleDateString('pt-BR'), it.vBruto.toFixed(2), it.vDesconto.toFixed(2), it.motivo, it.vLiquido.toFixed(2)]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(["\ufeff" + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `financeiro_sfk_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">Relatório Financeiro</h2>
          <p className="text-slate-500 font-medium">Projeção de faturamento baseada no 'Custo' das turmas.</p>
        </div>
        <button onClick={handleExport} className="flex items-center gap-2 bg-[#0f172a] text-white px-8 py-4 rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl active:scale-95">
          <Download className="w-5 h-5" /> EXPORTAR CSV
        </button>
      </div>

      <div className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-blue-500" /> INÍCIO</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-blue-500" /> FIM</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none font-bold text-slate-700" />
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-blue-500" /> UNIDADE</label>
            <select value={filtroUnidade} onChange={e => setFiltroUnidade(e.target.value)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl focus:border-blue-500 outline-none transition-all font-bold text-slate-700 appearance-none cursor-pointer">
              <option value="">Todas as Unidades</option>
              {unidadesUnicas.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 ml-1 tracking-widest flex items-center gap-2"><User className="w-3.5 h-3.5 text-blue-500" /> PROFESSORES</label>
            <div className="relative">
              <button onClick={() => setIsProfOpen(!isProfOpen)} className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl flex items-center justify-between font-bold text-sm text-slate-700">
                <span>{professoresSelecionados.length === 0 ? 'Todos' : `${professoresSelecionados.length} selecionados`}</span>
                {isProfOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {isProfOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl z-50 p-4 max-h-[250px] overflow-y-auto">
                  {professoresUnicos.map(p => (
                    <label key={p} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-xl cursor-pointer transition-colors">
                      <input type="checkbox" checked={professoresSelecionados.includes(p)} onChange={() => setProfessoresSelecionados(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])} className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500" />
                      <span className="text-[10px] font-black text-slate-600 uppercase">{p}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">RECEITA BRUTA TOTAL</p>
           <h4 className="text-5xl font-black text-slate-900 leading-none">{stats.summary.bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
           <p className="text-[10px] font-black text-slate-500 uppercase mt-6 flex items-center gap-2"><DollarSign className="w-4 h-4"/> {stats.summary.count} MENSALIDADES</p>
        </div>
        <div className="bg-white p-10 rounded-[40px] shadow-sm border border-slate-100">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">TOTAL DE DESCONTOS</p>
           <h4 className="text-5xl font-black text-red-500 leading-none">{stats.summary.descontos.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
           <p className="text-[10px] font-black text-red-400 uppercase mt-6 flex items-center gap-2"><TrendingDown className="w-4 h-4"/> {stats.summary.discountCount} DESCONTOS APLICADOS</p>
        </div>
        <div className="bg-blue-600 p-10 rounded-[40px] shadow-xl text-white">
           <p className="text-[10px] font-black text-blue-200 uppercase tracking-widest mb-2">RECEITA LÍQUIDA ESTIMADA</p>
           <h4 className="text-5xl font-black leading-none">{stats.summary.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</h4>
           <p className="text-[10px] font-black text-blue-100 uppercase mt-6 flex items-center gap-2"><Activity className="w-4 h-4"/> FATURAMENTO LÍQUIDO ESTIMADO</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex bg-slate-100 p-1.5 rounded-[24px] w-fit shadow-inner">
          <button onClick={() => setViewType('professor')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${viewType === 'professor' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>RESUMO POR PROFESSOR</button>
          <button onClick={() => setViewType('unidade')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${viewType === 'unidade' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>RESUMO POR UNIDADE</button>
          <button onClick={() => setViewType('detalhado')} className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black flex items-center gap-2 transition-all ${viewType === 'detalhado' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>DETALHAMENTO NOMINAL</button>
        </div>

        {viewType === 'professor' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {resumoProfessor.map((p:any, i:number) => (
              <div key={i} className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col relative overflow-hidden group">
                <div className="flex items-center gap-4 mb-6">
                   <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center"><User className="w-6 h-6 text-slate-400" /></div>
                   <h3 className="text-xl font-black text-slate-800 uppercase truncate">{p.nome}</h3>
                </div>
                <div className="space-y-3 mb-8">
                   <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Bruto</span><span className="text-slate-700">{p.bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span></div>
                   <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase"><span>Mensalidades</span><span className="text-slate-700">{p.count}</span></div>
                </div>
                <div className="pt-6 border-t border-slate-50">
                   <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">Líquido Estimado</p>
                   <p className="text-3xl font-black text-blue-600">{p.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewType === 'unidade' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
             <table className="w-full text-left">
                <thead>
                   <tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                      <th className="px-8 py-6">UNIDADE</th>
                      <th className="px-8 py-6 text-right">BRUTO</th>
                      <th className="px-8 py-6 text-right">LÍQUIDO</th>
                      <th className="px-8 py-6 text-center">QTDE MENSALIDADES</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                   {resumoUnidade.map((u:any, i:number) => (
                     <tr key={i} className="hover:bg-slate-50 font-bold text-slate-700">
                        <td className="px-8 py-6 uppercase">{u.nome}</td>
                        <td className="px-8 py-6 text-right">{u.bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="px-8 py-6 text-right text-blue-600 font-black">{u.liquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        <td className="px-8 py-6 text-center">{u.count}</td>
                     </tr>
                   ))}
                </tbody>
             </table>
          </div>
        )}

        {viewType === 'detalhado' && (
          <div className="bg-white rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-[#0f172a] text-white text-[10px] font-black uppercase tracking-widest">
                         <th className="px-8 py-6">ESTUDANTE / VENCIMENTO</th>
                         <th className="px-8 py-6">UNIDADE / TURMA</th>
                         <th className="px-8 py-6">PROFESSOR</th>
                         <th className="px-8 py-6 text-right">VALOR BASE</th>
                         <th className="px-8 py-6 text-right">DESCONTO</th>
                         <th className="px-8 py-6">MOTIVO</th>
                         <th className="px-8 py-6 text-right">LÍQUIDO</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-50">
                      {stats.items.length > 0 ? stats.items.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50/50">
                           <td className="px-8 py-5">
                              <p className="text-sm font-black text-slate-800 uppercase">{row.estudante}</p>
                              <p className="text-[10px] font-bold text-slate-400 mt-1">Vencimento: {row.vencimento.toLocaleDateString('pt-BR')}</p>
                           </td>
                           <td className="px-8 py-5">
                              <p className="text-[10px] font-black text-blue-500 uppercase">{row.unidade}</p>
                              <p className="text-xs font-bold text-slate-700 uppercase">{row.turma}</p>
                           </td>
                           <td className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">{row.professor}</td>
                           <td className="px-8 py-5 text-right font-bold">{row.vBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                           <td className="px-8 py-5 text-right font-bold text-red-400">-{row.vDesconto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                           <td className="px-8 py-5"><span className="text-[9px] font-black px-2 py-1 bg-slate-50 rounded uppercase text-slate-400">{row.motivo}</span></td>
                           <td className="px-8 py-5 text-right font-black text-blue-600 text-lg">{row.vLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                        </tr>
                      )) : (
                        <tr><td colSpan={7} className="px-8 py-20 text-center text-slate-300 font-black uppercase">Nenhum dado projetado para este período.</td></tr>
                      )}
                   </tbody>
                </table>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Financeiro;
