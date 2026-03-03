import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  Zap, 
  Thermometer, 
  Gauge, 
  Package, 
  Terminal, 
  FileText, 
  RefreshCw, 
  Eye,
  TrendingUp,
  Battery
} from 'lucide-react';

interface Box {
  id: number;
  x: number;
  temp: number;
  isSensed: boolean;
}

interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
}

export const WorkCellDashboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isEStop, setIsEStop] = useState(false);
  const [isThermalView, setIsThermalView] = useState(false);
  const [palletizedCount, setPalletizedCount] = useState(0);
  const [payload, setPayload] = useState(20); // 10kg or 30kg
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [bpm, setBpm] = useState(0);
  const [rul, setRul] = useState(98.4);
  
  // Simulation State
  const boxesRef = useRef<Box[]>([]);
  const nextBoxId = useRef(0);
  const lastBoxTime = useRef(Date.now());
  const palletTimes = useRef<number[]>([]);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog = {
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50));
  };

  const handleEStop = () => {
    setIsEStop(!isEStop);
    if (!isEStop) {
      addLog("EMERGENCY STOP ACTIVATED", "error");
    } else {
      addLog("SYSTEM RECOVERED FROM E-STOP", "success");
    }
  };

  const handleReset = () => {
    setIsEStop(false);
    setPalletizedCount(0);
    boxesRef.current = [];
    palletTimes.current = [];
    setBpm(0);
    addLog("SYSTEM RESET INITIATED", "info");
    addLog("Analyzing Industrial Sequence...", "info");
  };

  const generateReport = () => {
    const content = `ROBOTIC WORK-CELL DIAGNOSTIC REPORT
Generated: ${new Date().toLocaleString()}
------------------------------------------
SYSTEM STATUS: ${isEStop ? 'HALTED' : 'OPERATIONAL'}
PALLETIZED COUNT: ${palletizedCount}
THROUGHPUT: ${bpm} BPM
CURRENT PAYLOAD: ${payload} kg
PREDICTIVE RUL: ${rul}%
ENERGY EFFICIENCY: ${(payload * 0.15 + (bpm / 60)).toFixed(2)} kW/h
------------------------------------------
LOG SUMMARY:
${logs.slice(0, 10).map(l => `[${l.timestamp}] ${l.message}`).join('\n')}
------------------------------------------
END OF REPORT`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WorkCell_Report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addLog("Technical report generated and exported", "success");
  };

  // Canvas Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const sensorLineX = 500;

    const render = () => {
      if (!isEStop) {
        // Update Boxes
        const now = Date.now();
        
        // Spawn boxes
        if (now - lastBoxTime.current > 2000) {
          boxesRef.current.push({
            id: nextBoxId.current++,
            x: -50,
            temp: 25 + Math.random() * 15,
            isSensed: false
          });
          lastBoxTime.current = now;
        }

        // Move boxes
        boxesRef.current.forEach(box => {
          box.x += 2; // Speed

          // Sensor Logic
          if (!box.isSensed && box.x >= sensorLineX - 20 && box.x <= sensorLineX + 20) {
            box.isSensed = true;
            setPalletizedCount(prev => prev + 1);
            palletTimes.current.push(now);
            addLog(`SENSE_LOCK: Box #${box.id} detected`, "success");
          }
        });

        // Cleanup off-screen boxes
        boxesRef.current = boxesRef.current.filter(box => box.x < 850);

        // Calculate BPM (last 60 seconds)
        const oneMinAgo = now - 60000;
        palletTimes.current = palletTimes.current.filter(t => t > oneMinAgo);
        setBpm(palletTimes.current.length);
        
        // Degrade RUL slightly over time
        if (now % 100 === 0) setRul(prev => Math.max(0, prev - 0.0001));
      }

      // Draw
      ctx.clearRect(0, 0, 800, 200);
      
      // Conveyor Belt
      ctx.fillStyle = '#111';
      ctx.fillRect(0, 80, 800, 40);
      ctx.strokeStyle = '#333';
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(0, 100);
      ctx.lineTo(800, 100);
      ctx.stroke();
      ctx.setLineDash([]);

      // Camera Line
      ctx.strokeStyle = isEStop ? '#ff0000' : '#00ffff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sensorLineX, 40);
      ctx.lineTo(sensorLineX, 160);
      ctx.stroke();
      
      // Camera Icon/Glow
      ctx.fillStyle = isEStop ? 'rgba(255,0,0,0.2)' : 'rgba(0,255,255,0.1)';
      ctx.fillRect(sensorLineX - 10, 40, 20, 120);

      // Draw Boxes
      boxesRef.current.forEach(box => {
        const isSensing = box.x >= sensorLineX - 30 && box.x <= sensorLineX + 30;
        
        if (isThermalView) {
          const hue = Math.max(0, 240 - (box.temp - 20) * 10);
          ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        } else {
          ctx.fillStyle = isSensing ? '#e6fb04' : '#444';
        }
        
        ctx.fillRect(box.x, 85, 30, 30);
        ctx.strokeStyle = isSensing ? '#fff' : '#666';
        ctx.strokeRect(box.x, 85, 30, 30);

        if (isSensing && !isEStop) {
          ctx.strokeStyle = '#e6fb04';
          ctx.lineWidth = 1;
          ctx.strokeRect(box.x - 5, 80, 40, 40);
        }
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [isEStop, isThermalView]);

  const GaugeSVG = ({ label, value, max, color, unit }: { label: string, value: number, max: number, color: string, unit: string }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / max) * circumference;

    return (
      <div className="flex flex-col items-center gap-2 glass-card backdrop-blur-[10px] p-4 border border-white/5 bg-white/5">
        <div className="relative w-24 h-24">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="48" cy="48" r={radius}
              stroke="rgba(255,255,255,0.05)"
              strokeWidth="8"
              fill="transparent"
            />
            <circle
              cx="48" cy="48" r={radius}
              stroke={color}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-mono font-bold text-white">{value.toFixed(0)}</span>
            <span className="text-[10px] font-mono text-white/40 uppercase">{unit}</span>
          </div>
        </div>
        <span className="text-[10px] font-mono text-white/60 uppercase tracking-widest">{label}</span>
      </div>
    );
  };

  return (
    <div className={`w-full min-h-screen p-6 font-sans transition-colors duration-500 relative overflow-hidden ${isEStop ? 'bg-red-950/20' : 'bg-[#050505]'}`}>
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
        <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Header Section */}
        <div className="lg:col-span-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 glass-card backdrop-blur-[10px] p-6 border border-white/10 bg-white/5">
          <div>
            <h1 className="text-2xl font-mono font-bold text-white flex items-center gap-3">
              <Activity className={isEStop ? "text-red-500" : "text-neon"} />
              ROBOTIC_WORK_CELL_DASHBOARD
            </h1>
            <p className="text-white/40 font-mono text-xs mt-1 uppercase tracking-widest">
              Status: <span className={isEStop ? "text-red-500" : "text-cyan-400"}>{isEStop ? "SYSTEM_HALTED" : "SYSTEM_READY"}</span> | 
              Location: Warehouse_Sector_7G
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleEStop}
              className={`px-6 py-3 rounded font-mono text-xs font-bold uppercase tracking-widest transition-all ${isEStop ? 'bg-white text-black' : 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/20'}`}
            >
              {isEStop ? "Resume System" : "Emergency Stop"}
            </button>
            <button 
              onClick={handleReset}
              className="p-3 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded transition-all"
              title="System Reset"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* HUD Gauges */}
        <div className="lg:col-span-4 grid grid-cols-1 gap-4">
          <GaugeSVG label="Motor Temp" value={isEStop ? 22 : 45 + Math.random() * 5} max={100} color="#e6fb04" unit="°C" />
          <GaugeSVG label="System Voltage" value={isEStop ? 0 : 238 + Math.random() * 4} max={250} color="#00ffff" unit="V" />
          <GaugeSVG label="Cycle Speed" value={isEStop ? 0 : bpm * 2.5} max={100} color="#ff0055" unit="%" />
        </div>

        {/* Main Simulation Area */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Conveyor Simulation */}
          <div className="glass-card backdrop-blur-[10px] border border-white/10 overflow-hidden relative bg-white/5">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-2 text-neon">
                <Package size={16} />
                <h3 className="font-mono text-xs uppercase font-bold tracking-widest">Live_Schematic: Conveyor_A1</h3>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsThermalView(!isThermalView)}
                  className={`flex items-center gap-2 px-3 py-1 rounded font-mono text-[10px] uppercase transition-all ${isThermalView ? 'bg-orange-500 text-white' : 'bg-white/5 text-white/60 hover:text-white'}`}
                >
                  <Thermometer size={12} />
                  Thermal View
                </button>
                <div className="text-[10px] font-mono text-white/40 uppercase">
                  Palletized: <span className="text-neon">{palletizedCount}</span>
                </div>
              </div>
            </div>
            <div className="bg-black/40 h-[200px]">
              <canvas ref={canvasRef} width={800} height={200} className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Analytics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card backdrop-blur-[10px] p-4 border border-white/5 bg-white/5">
              <div className="flex items-center gap-2 text-white/40 mb-3">
                <TrendingUp size={14} />
                <span className="text-[10px] font-mono uppercase">Throughput</span>
              </div>
              <div className="text-2xl font-mono font-bold text-neon">{bpm} <span className="text-xs text-white/40">BPM</span></div>
              <div className="mt-2 h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-neon transition-all duration-1000" style={{ width: `${(bpm/40)*100}%` }} />
              </div>
            </div>
            <div className="glass-card backdrop-blur-[10px] p-4 border border-white/5 bg-white/5">
              <div className="flex items-center gap-2 text-white/40 mb-3">
                <Battery size={14} />
                <span className="text-[10px] font-mono uppercase">Energy Efficiency</span>
              </div>
              <div className="text-2xl font-mono font-bold text-cyan-400">{(payload * 0.15 + (bpm / 60)).toFixed(2)} <span className="text-xs text-white/40">kW/h</span></div>
              <div className="mt-2 text-[9px] font-mono text-white/30 italic">Estimated based on payload: {payload}kg</div>
            </div>
            <div className="glass-card backdrop-blur-[10px] p-4 border border-white/5 bg-white/5">
              <div className="flex items-center gap-2 text-white/40 mb-3">
                <Zap size={14} />
                <span className="text-[10px] font-mono uppercase">Predictive RUL</span>
              </div>
              <div className={`text-2xl font-mono font-bold ${rul < 20 ? 'text-red-500' : 'text-white'}`}>{rul.toFixed(2)} <span className="text-xs text-white/40">%</span></div>
              <div className="mt-2 text-[9px] font-mono text-white/30 uppercase tracking-tighter">Next Maintenance: 1,420 hrs</div>
            </div>
          </div>
        </div>

        {/* Load Stress Graph & Controls */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="glass-card backdrop-blur-[10px] p-4 border border-white/10 h-full flex flex-col bg-white/5">
            <div className="flex items-center gap-2 text-neon mb-4">
              <Activity size={16} />
              <h3 className="font-mono text-xs uppercase font-bold">Load_Stress_Analysis</h3>
            </div>
            <div className="flex-grow flex items-end gap-1 h-32 mb-4">
              {Array.from({ length: 20 }).map((_, i) => {
                const height = isEStop ? 5 : (Math.random() * (payload > 20 ? 80 : 40) + 10);
                return (
                  <div 
                    key={i} 
                    className={`flex-1 rounded-t transition-all duration-500 ${payload > 20 ? 'bg-red-500/50' : 'bg-neon/50'}`}
                    style={{ height: `${height}%` }}
                  />
                );
              })}
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-mono text-white/40 mb-2 uppercase">
                  <span>Payload Selection</span>
                  <span className="text-neon">{payload} kg</span>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setPayload(10)}
                    className={`flex-1 py-2 rounded font-mono text-[10px] uppercase transition-all ${payload === 10 ? 'bg-neon text-black font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    10kg
                  </button>
                  <button 
                    onClick={() => setPayload(30)}
                    className={`flex-1 py-2 rounded font-mono text-[10px] uppercase transition-all ${payload === 30 ? 'bg-red-600 text-white font-bold' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                  >
                    30kg
                  </button>
                </div>
              </div>
              <button 
                onClick={generateReport}
                className="w-full py-3 bg-neon/10 border border-neon/30 text-neon rounded font-mono text-[10px] uppercase font-bold hover:bg-neon hover:text-black transition-all flex items-center justify-center gap-2"
              >
                <FileText size={14} />
                Generate Technical Report
              </button>
            </div>
          </div>
        </div>

        {/* System Log Console */}
        <div className="lg:col-span-8 glass-card backdrop-blur-[10px] border border-white/10 flex flex-col h-[300px] bg-white/5">
          <div className="flex items-center gap-2 p-3 border-b border-white/5 bg-white/5">
            <Terminal size={14} className="text-neon" />
            <h3 className="font-mono text-xs uppercase font-bold tracking-widest">System_Log_Console</h3>
          </div>
          <div className="flex-grow overflow-y-auto p-4 font-mono text-[11px] space-y-2 custom-scrollbar bg-black/20">
            {logs.length === 0 && <div className="text-white/20 italic">No active logs...</div>}
            {logs.map((log, i) => (
              <div key={i} className="flex gap-3 animate-in fade-in slide-in-from-left-2 duration-300">
                <span className="text-white/20">[{log.timestamp}]</span>
                <span className={`
                  ${log.type === 'error' ? 'text-red-500' : ''}
                  ${log.type === 'warning' ? 'text-orange-400' : ''}
                  ${log.type === 'success' ? 'text-neon' : ''}
                  ${log.type === 'info' ? 'text-cyan-400' : ''}
                `}>
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
