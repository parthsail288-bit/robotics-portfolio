import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Crosshair, Settings, StopCircle, PlayCircle, RefreshCw, Activity, FileText, Trash2, Calculator } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface DHParam {
  joint: string;
  a: number;
  alpha: string;
  d: number;
  theta: number;
}

interface Telemetry {
  joints: number[];
  torque2: number;
  torque3: number;
  pos: Point;
  manipulability: number;
  isSingular: boolean;
  power: number;
}

interface RoboticArmIKProps {
  isBlueprint: boolean;
  setIsBlueprint: (val: boolean) => void;
}

export const RoboticArmIK: React.FC<RoboticArmIKProps> = ({ isBlueprint, setIsBlueprint }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // State
  const [payload, setPayload] = useState<number>(20);
  const [precisionView, setPrecisionView] = useState<boolean>(false);
  const [isStopped, setIsStopped] = useState<boolean>(false);
  const [autoSync, setAutoSync] = useState<boolean>(true);
  const [hoveredJoint, setHoveredJoint] = useState<number | null>(null);
  const [matrixLog, setMatrixLog] = useState<string>("");
  const [path, setPath] = useState<Point[]>([]);
  const pathRef = useRef<Point[]>([]);
  const [dhParams, setDhParams] = useState<DHParam[]>([
    { joint: 'J1', a: 0, alpha: '-π/2', d: 80, theta: 0 },
    { joint: 'J2', a: 150, alpha: '0', d: 0, theta: 0 },
    { joint: 'J3', a: 120, alpha: '0', d: 0, theta: 0 },
    { joint: 'J4', a: 40, alpha: '-π/2', d: 0, theta: 0 },
    { joint: 'J5', a: 40, alpha: 'π/2', d: 0, theta: 0 },
    { joint: 'J6', a: 60, alpha: '0', d: 0, theta: 0 },
  ]);
  
  const [telemetry, setTelemetry] = useState<Telemetry>({
    joints: [0, 0, 0, 0, 0, 0],
    torque2: 0,
    torque3: 0,
    pos: { x: 0, y: 0 },
    manipulability: 1.0,
    isSingular: false,
    power: 0
  });

  // Refs for animation loop
  const targetPos = useRef<Point>({ x: 550, y: 300 });
  const lastTargetPos = useRef<Point>({ x: 550, y: 300 });
  const velocity = useRef<Point>({ x: 0, y: 0 });
  const acceleration = useRef<Point>({ x: 0, y: 0 });
  const lastVelocity = useRef<Point>({ x: 0, y: 0 });
  
  const isStoppedRef = useRef(isStopped);
  const autoSyncRef = useRef(autoSync);
  const payloadRef = useRef(payload);
  const precisionViewRef = useRef(precisionView);
  const dhParamsRef = useRef(dhParams);
  const isBlueprintRef = useRef(isBlueprint);
  const hoveredJointRef = useRef<number | null>(null);
  
  // Arm configuration
  const origin = { x: 400, y: 550 };
  const joints = useRef<Point[]>([
    { ...origin },
    { x: 400, y: 470 },
    { x: 400, y: 320 },
    { x: 400, y: 200 },
    { x: 400, y: 160 },
    { x: 400, y: 120 },
    { x: 460, y: 120 } // Gripper tip
  ]);
  
  const ghostJoints = useRef<Point[]>([...joints.current]);

  // Sync state to refs
  useEffect(() => { isStoppedRef.current = isStopped; }, [isStopped]);
  useEffect(() => { autoSyncRef.current = autoSync; }, [autoSync]);
  useEffect(() => { payloadRef.current = payload; }, [payload]);
  useEffect(() => { precisionViewRef.current = precisionView; }, [precisionView]);
  useEffect(() => { dhParamsRef.current = dhParams; }, [dhParams]);
  useEffect(() => { isBlueprintRef.current = isBlueprint; }, [isBlueprint]);
  useEffect(() => { hoveredJointRef.current = hoveredJoint; }, [hoveredJoint]);

  const dist = (p1: Point, p2: Point) => Math.hypot(p2.x - p1.x, p2.y - p1.y);

  const solveFABRIK = useCallback((target: Point, jointRef: React.MutableRefObject<Point[]>) => {
    const j = jointRef.current;
    const params = dhParamsRef.current;
    
    // Level-Gripper Logic: The last segment (J6) must be horizontal.
    const L6 = params[5].a;
    const wristTarget = { x: target.x - L6, y: target.y };
    
    const lengths = [params[0].d, params[1].a, params[2].a, params[3].a, params[4].a];
    const totalLength = lengths.reduce((a, b) => a + b, 0);
    const d = dist(j[0], wristTarget);

    // FABRIK for joints 0 to 5
    if (d > totalLength) {
      for (let i = 0; i < 5; i++) {
        const r = dist(j[i], wristTarget);
        const lambda = lengths[i] / r;
        j[i + 1] = {
          x: (1 - lambda) * j[i].x + lambda * wristTarget.x,
          y: (1 - lambda) * j[i].y + lambda * wristTarget.y
        };
      }
    } else {
      const b = { ...j[0] };
      for (let iter = 0; iter < 15; iter++) {
        j[5] = { ...wristTarget };
        for (let i = 4; i >= 0; i--) {
          const r = dist(j[i + 1], j[i]);
          const lambda = lengths[i] / r;
          j[i] = {
            x: (1 - lambda) * j[i + 1].x + lambda * j[i].x,
            y: (1 - lambda) * j[i + 1].y + lambda * j[i].y
          };
        }
        j[0] = { ...b };
        for (let i = 0; i < 5; i++) {
          const r = dist(j[i + 1], j[i]);
          const lambda = lengths[i] / r;
          j[i + 1] = {
            x: (1 - lambda) * j[i].x + lambda * j[i + 1].x,
            y: (1 - lambda) * j[i].y + lambda * j[i + 1].y
          };
        }
      }
    }
    
    // Force J6 (gripper) to be horizontal
    j[6] = { x: j[5].x + L6, y: j[5].y };

    // Apply Elasticity Droop (2px vertical offset at 30kg)
    if (payloadRef.current >= 30) {
      j[6].y += 2;
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isStopped) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    targetPos.current = {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const handleDoubleClick = () => {
    setIsStopped(!isStopped);
  };

  const handleReset = () => {
    setIsStopped(false);
    targetPos.current = { x: 550, y: 300 };
    setPath([]);
    pathRef.current = [];
  };

  const clearPath = () => {
    setPath([]);
    pathRef.current = [];
  };

  const generateReport = () => {
    const stCode = `
(* PLC Structured Text Snippet *)
VAR
    P1 : POINT := (X:=${targetPos.current.x.toFixed(2)}, Y:=${targetPos.current.y.toFixed(2)}, Z:=0.0);
    v500 : SPEED := 500.0;
    z10 : ZONE := 10.0;
END_VAR

MOVE_L(P1, v500, z10);
`;

    const content = `ROBOT KINEMATICS TECHNICAL REPORT
Generated: ${new Date().toLocaleString()}
------------------------------------------
D-H CONFIGURATION:
${dhParams.map(p => `${p.joint}: a=${p.a}mm, alpha=${p.alpha}, d=${p.d}mm`).join('\n')}

FINAL POSE:
End-Effector XYZ (Canvas): [${targetPos.current.x.toFixed(2)}, ${targetPos.current.y.toFixed(2)}, 0]
Joint Angles (deg):
${telemetry.joints.map((a, i) => `J${i+1}: ${a.toFixed(2)}°`).join('\n')}

DYNAMICS ANALYSIS:
Payload: ${payload} kg
J2 Torque: ${telemetry.torque2.toFixed(2)} Nm
J3 Torque: ${telemetry.torque3.toFixed(2)} Nm
Manipulability: ${telemetry.manipulability.toFixed(4)}
Power Consumption: ${telemetry.power.toFixed(2)} W

------------------------------------------
PLC EXPORT (Structured Text):
${stCode}
------------------------------------------
END OF REPORT`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Robot_Report_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateDH = (index: number, field: keyof DHParam, value: string | number) => {
    const newParams = [...dhParams];
    if (field === 'a' || field === 'd') {
      newParams[index] = { ...newParams[index], [field]: Number(value) };
    }
    setDhParams(newParams);
    
    // If autoSync is on, the next frame will automatically use these new lengths
  };

  const calculateMatrixTrace = () => {
    const params = dhParams;
    const angles = telemetry.joints.map(a => a * Math.PI / 180);
    
    // Identity matrix
    let T = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];

    const multiply = (A: number[][], B: number[][]) => {
      const C = [[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];
      for(let i=0; i<4; i++)
        for(let j=0; j<4; j++)
          for(let k=0; k<4; k++)
            C[i][j] += A[i][k] * B[k][j];
      return C;
    };

    let log = "--- STEP-BY-STEP MATRIX CALCULATION ---\n";
    
    params.forEach((p, i) => {
      const theta = angles[i] || 0;
      const alpha = p.alpha === '-π/2' ? -Math.PI/2 : (p.alpha === 'π/2' ? Math.PI/2 : 0);
      const a = p.a;
      const d = p.d;

      const Ai = [
        [Math.cos(theta), -Math.sin(theta)*Math.cos(alpha), Math.sin(theta)*Math.sin(alpha), a*Math.cos(theta)],
        [Math.sin(theta), Math.cos(theta)*Math.cos(alpha), -Math.cos(theta)*Math.sin(alpha), a*Math.sin(theta)],
        [0, Math.sin(alpha), Math.cos(alpha), d],
        [0, 0, 0, 1]
      ];

      T = multiply(T, Ai);
      log += `\n[T${i+1}] Transformation Matrix:\n`;
      log += T.map(row => row.map(v => v.toFixed(2).padStart(6)).join(" ")).join("\n") + "\n";
    });

    log += "\n--- FINAL TRANSFORMATION MATRIX ⁰T₆ ---\n";
    log += T.map(row => row.map(v => v.toFixed(2).padStart(6)).join(" ")).join("\n");
    
    setMatrixLog(log);
  };

  const handleManualSolve = () => {
    solveFABRIK(targetPos.current, joints);
    calculateMatrixTrace();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let frameCount = 0;

    const render = () => {
      // Velocity and Acceleration tracking
      velocity.current = {
        x: targetPos.current.x - lastTargetPos.current.x,
        y: targetPos.current.y - lastTargetPos.current.y
      };
      acceleration.current = {
        x: velocity.current.x - lastVelocity.current.x,
        y: velocity.current.y - lastVelocity.current.y
      };
      lastTargetPos.current = { ...targetPos.current };
      lastVelocity.current = { ...velocity.current };

      if (!isStoppedRef.current && autoSyncRef.current) {
        solveFABRIK(targetPos.current, joints);
        
        // Ghost Preview: Project 10 frames ahead
        const ghostTarget = {
          x: targetPos.current.x + velocity.current.x * 10,
          y: targetPos.current.y + velocity.current.y * 10
        };
        solveFABRIK(ghostTarget, ghostJoints);

        // Update path
        if (frameCount % 2 === 0) {
          pathRef.current = [...pathRef.current.slice(-100), { ...joints.current[6] }];
        }
      }

      const j = joints.current;
      const getAngle = (p1: Point, p2: Point) => Math.atan2((600 - p2.y) - (600 - p1.y), p2.x - p1.x);
      
      const angles = [];
      angles.push(getAngle(j[0], j[1]) - Math.PI/2);
      for (let i = 1; i < 6; i++) {
        angles.push(getAngle(j[i], j[i+1]) - getAngle(j[i-1], j[i]));
      }

      // Singularity Monitor: Manipulability Index (Simplified Jacobian Determinant)
      // For a planar arm, manipulability is proportional to sin(theta_elbow)
      // We'll use the angle between J2 and J3 as a proxy
      const manipulability = Math.abs(Math.sin(angles[2]));
      const isSingular = manipulability < 0.1;

      // Energy Dashboard: Power Consumption
      const mass = payloadRef.current;
      const g = 9.81;
      const velMag = Math.hypot(velocity.current.x, velocity.current.y);
      const accMag = Math.hypot(acceleration.current.x, acceleration.current.y);
      const inertia = 5.0; // Simplified inertia constant
      const power = (mass * g * velMag * 0.1) + (accMag * inertia);

      const torque2 = mass * g * ((j[6].x - j[1].x) / 100);
      const torque3 = mass * g * ((j[6].x - j[2].x) / 100);

      if (frameCount % 5 === 0) {
        setTelemetry({
          joints: angles.map(a => a * 180 / Math.PI),
          torque2,
          torque3,
          pos: { ...j[6] },
          manipulability,
          isSingular,
          power
        });
      }

      ctx.fillStyle = isBlueprintRef.current ? '#002b55' : '#050505';
      ctx.fillRect(0, 0, 800, 600);
      
      // Grid
      if (isBlueprintRef.current) {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (let x = 0; x <= 800; x += 10) {
          for (let y = 0; y <= 600; y += 10) {
            ctx.fillRect(x, y, 1, 1);
          }
        }
      } else {
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 800; i += 50) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 600); ctx.stroke(); }
        for (let i = 0; i <= 600; i += 50) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(800, i); ctx.stroke(); }
      }

      // Path
      const currentPath = pathRef.current;
      if (currentPath.length > 1) {
        ctx.strokeStyle = isBlueprintRef.current ? '#ffffff' : '#ff0000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(currentPath[0].x, currentPath[0].y);
        currentPath.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      }

      // Ghost Arm (20% Opacity)
      if (!isStoppedRef.current && autoSyncRef.current) {
        const gj = ghostJoints.current;
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = isBlueprintRef.current ? '#ffffff' : '#e6fb04';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(gj[0].x, gj[0].y);
        for (let i = 1; i < 7; i++) ctx.lineTo(gj[i].x, gj[i].y);
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // Robot Base
      if (isBlueprintRef.current) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(360, 550, 80, 50);
      } else {
        ctx.fillStyle = '#222';
        ctx.beginPath();
        ctx.rect(360, 550, 80, 50);
        ctx.fill();
      }

      // Links
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 0; i < 6; i++) {
        const isHovered = hoveredJointRef.current === i;
        const isHighTorque = payloadRef.current >= 30;
        
        if (isBlueprintRef.current) {
          // Center line (dashed)
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.5;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(j[i].x, j[i].y);
          ctx.lineTo(j[i+1].x, j[i+1].y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Link outline (stroke only)
          ctx.lineWidth = 0.5;
          const angle = Math.atan2(j[i+1].y - j[i].y, j[i+1].x - j[i].x);
          const width = 10 - i;
          ctx.save();
          ctx.translate(j[i].x, j[i].y);
          ctx.rotate(angle);
          ctx.strokeRect(0, -width/2, dist(j[i], j[i+1]), width);
          ctx.restore();

          // Joint Annotations
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.5;
          // Crosshair
          ctx.beginPath();
          ctx.moveTo(j[i].x - 10, j[i].y); ctx.lineTo(j[i].x + 10, j[i].y);
          ctx.moveTo(j[i].x, j[i].y - 10); ctx.lineTo(j[i].x, j[i].y + 10);
          ctx.stroke();

          // Leader lines for d and theta
          if (i < 6) {
            ctx.font = '8px JetBrains Mono';
            ctx.fillStyle = '#ffffff';
            const angleDeg = (angles[i] * 180 / Math.PI).toFixed(1);
            const dVal = dhParamsRef.current[i].d;
            ctx.fillText(`θ:${angleDeg}°`, j[i].x + 15, j[i].y - 15);
            ctx.fillText(`d:${dVal}mm`, j[i].x + 15, j[i].y - 5);
            
            ctx.beginPath();
            ctx.moveTo(j[i].x + 5, j[i].y - 5);
            ctx.lineTo(j[i].x + 12, j[i].y - 12);
            ctx.stroke();
          }

        } else {
          ctx.strokeStyle = isSingular ? '#ff0000' : (isHighTorque ? '#ff6600' : '#f1c40f'); // Orange glow on high torque
          ctx.lineWidth = 20 - i * 2;
          ctx.setLineDash([]);
          
          // Torque Glow Effect
          if (isHighTorque && !isSingular) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = '#ff6600';
          } else {
            ctx.shadowBlur = 0;
          }

          ctx.beginPath();
          ctx.moveTo(j[i].x, j[i].y);
          ctx.lineTo(j[i+1].x, j[i+1].y);
          ctx.stroke();
          ctx.shadowBlur = 0;
          ctx.setLineDash([]);
          
          // Joint Detail
          ctx.fillStyle = isSingular ? '#ff0000' : (isHovered ? '#ffffff' : '#00ffff');
          ctx.beginPath();
          ctx.arc(j[i].x, j[i].y, isHovered ? 10 : 6, 0, Math.PI * 2);
          ctx.fill();
          
          if (isHovered) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(j[i].x, j[i].y, 14, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }

      // Vacuum Gripper (3x3)
      const tip = j[6];
      ctx.fillStyle = '#333';
      ctx.fillRect(tip.x - 10, tip.y - 15, 20, 30);
      ctx.fillStyle = '#00ffff';
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          ctx.beginPath();
          ctx.arc(tip.x - 6 + col * 6, tip.y - 10 + row * 10, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Precision View
      if (precisionViewRef.current) {
        j.forEach((p, i) => {
          const angle = i < 6 ? getAngle(j[i], j[i+1]) : 0;
          ctx.strokeStyle = '#ff3333'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(angle)*30, p.y - Math.sin(angle)*30); ctx.stroke();
          ctx.strokeStyle = '#33ff33'; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + Math.cos(angle+Math.PI/2)*30, p.y - Math.sin(angle+Math.PI/2)*30); ctx.stroke();
        });
      }

      frameCount++;
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [solveFABRIK]);

  return (
    <div className="flex flex-col xl:flex-row gap-4 w-full bg-[#050505]/80 backdrop-blur-[10px] p-4 rounded-xl border border-white/10 shadow-2xl overflow-hidden relative">
      {/* Scanline Overlay */}
      <div className="absolute inset-0 pointer-events-none z-50 opacity-[0.03] overflow-hidden">
        <div className="w-full h-full bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
      </div>

      {/* Simulation Area */}
      <div className="relative flex-grow bg-black rounded-lg border border-white/5 overflow-hidden h-[600px]">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="w-full h-full object-contain cursor-crosshair"
          onMouseMove={handleMouseMove}
          onDoubleClick={handleDoubleClick}
        />
        
        {/* Overlay Labels */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
          <div className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-tighter bg-black/60 p-2 rounded border ${telemetry.isSingular ? 'border-red-500 text-red-500 animate-pulse' : 'border-neon/20 text-neon/80'}`}>
            <Activity size={12} />
            <span>Mode: {isStopped ? 'POSE_LOCKED' : 'CURSOR_FOLLOW'}</span>
          </div>
          <div className={`flex items-center gap-2 font-mono text-[10px] uppercase tracking-tighter bg-black/60 p-2 rounded border ${telemetry.isSingular ? 'border-red-500 text-red-500' : 'border-neon/20 text-neon/80'}`}>
            <span>Manipulability: {telemetry.manipulability.toFixed(3)}</span>
            {telemetry.isSingular && <span className="ml-2 font-bold">[SINGULARITY_WARNING]</span>}
          </div>
          <div className="text-[9px] font-mono text-white/40 bg-black/40 p-2 rounded">
            Double-click to lock/unlock pose
          </div>
        </div>

        {/* Equation Panel */}
        <div className="absolute bottom-4 left-4 w-72 glass-card backdrop-blur-[10px] p-3 border border-neon/20 bg-black/60 max-h-[250px] overflow-y-auto custom-scrollbar z-20">
          <div className="flex items-center gap-2 text-neon mb-2 border-b border-neon/20 pb-1 sticky top-0 bg-black/60 z-10">
            <Calculator size={14} />
            <span className="font-mono text-[10px] uppercase font-bold">IK_ENGINE_LOG</span>
          </div>
          <div className="font-mono text-[9px] space-y-1 text-white/80 whitespace-pre">
            {matrixLog ? matrixLog : (
              <>
                <div className="text-neon/60">Target: [{targetPos.current.x.toFixed(1)}, {targetPos.current.y.toFixed(1)}]</div>
                <div>θ₁ = atan2(y, x) = {telemetry.joints[0].toFixed(2)}°</div>
                <div>c₂ = (x²+y²-a₁²-a₂²)/(2a₁a₂)</div>
                <div>θ₂ = acos(c₂) = {telemetry.joints[1].toFixed(2)}°</div>
                <div className="text-red-400 mt-2">Level-Gripper: θ₆ = -Σ(θ₁..θ₅)</div>
                <div className="text-white/40 mt-2 italic">Click "RUN MANUAL SOLVE" to see matrix trace</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="w-full xl:w-[450px] flex flex-col gap-4 overflow-y-auto max-h-[800px] xl:max-h-[600px] pr-2 custom-scrollbar z-20">
        
        {/* Mode Toggles & Manual Solve */}
        <div className="glass-card backdrop-blur-[10px] p-4 border border-neon/20 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-10 h-5 rounded-full transition-colors relative ${autoSync ? 'bg-neon' : 'bg-white/20'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-black transition-transform ${autoSync ? 'left-6' : 'left-1'}`} />
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                Auto-Sync
              </span>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
              />
            </label>

            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-10 h-5 rounded-full transition-colors relative ${isBlueprint ? 'bg-blue-500' : 'bg-white/20'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full bg-black transition-transform ${isBlueprint ? 'left-6' : 'left-1'}`} />
              </div>
              <span className="font-mono text-xs uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                Blueprint
              </span>
              <input 
                type="checkbox" 
                className="hidden" 
                checked={isBlueprint}
                onChange={(e) => setIsBlueprint(e.target.checked)}
              />
            </label>
          </div>
          
          <button 
            disabled={autoSync}
            onClick={handleManualSolve}
            className={`w-full py-2 rounded font-mono text-[10px] uppercase font-bold transition-all ${autoSync ? 'opacity-30 cursor-not-allowed bg-white/5 text-white/40' : 'bg-neon text-black hover:bg-neon/80'}`}
          >
            Run Manual Solve
          </button>
        </div>
        
        {/* D-H Parameter Table */}
        <div className="glass-card backdrop-blur-[10px] p-4 border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-neon">
              <Settings size={16} />
              <h3 className="font-mono text-xs uppercase font-bold">D-H Configuration</h3>
            </div>
            <span className="text-[9px] text-white/40 font-mono">Hover to Highlight Joint</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[10px]">
              <thead className="text-neon/60 border-b border-white/10">
                <tr>
                  <th className="pb-2">Joint</th>
                  <th className="pb-2">a (mm)</th>
                  <th className="pb-2">α</th>
                  <th className="pb-2">d (mm)</th>
                  <th className="pb-2">θ (deg)</th>
                </tr>
              </thead>
              <tbody className="text-white/80">
                {dhParams.map((p, i) => (
                  <tr 
                    key={p.joint} 
                    onMouseEnter={() => setHoveredJoint(i)}
                    onMouseLeave={() => setHoveredJoint(null)}
                    className={`border-b border-white/5 transition-colors ${hoveredJoint === i ? 'bg-white/10' : 'hover:bg-white/5'}`}
                  >
                    <td className={`py-2 ${hoveredJoint === i ? 'text-white' : 'text-neon/40'}`}>{p.joint}</td>
                    <td className="py-1">
                      <input 
                        type="number" 
                        value={p.a} 
                        onChange={(e) => updateDH(i, 'a', e.target.value)}
                        className="w-12 bg-black/40 border border-white/10 rounded px-1 text-neon focus:border-neon outline-none"
                      />
                    </td>
                    <td className="py-1 text-white/40">{p.alpha}</td>
                    <td className="py-1">
                      <input 
                        type="number" 
                        value={p.d} 
                        onChange={(e) => updateDH(i, 'd', e.target.value)}
                        className="w-12 bg-black/40 border border-white/10 rounded px-1 text-neon focus:border-neon outline-none"
                      />
                    </td>
                    <td className="py-1 text-neon font-bold">{telemetry.joints[i]?.toFixed(1)}°</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dynamics & Report */}
        <div className="grid grid-cols-1 gap-4">
          <div className="glass-card backdrop-blur-[10px] p-4 border border-white/10">
            <div className="flex items-center gap-2 text-neon mb-4">
              <Activity size={16} />
              <h3 className="font-mono text-xs uppercase font-bold">R&D Diagnostics</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[10px] font-mono text-white/60 mb-2">
                  <span>Mass: {payload}kg</span>
                  <span className={payload >= 30 ? "text-red-400 font-bold" : "text-neon"}>
                    {payload >= 30 ? "HIGH_TORQUE_LOAD" : "NOMINAL_STRESS"}
                  </span>
                </div>
                <input 
                  type="range" min="10" max="30" value={payload}
                  onChange={(e) => setPayload(Number(e.target.value))}
                  className="w-full accent-neon h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <div className="text-[8px] text-white/40 uppercase mb-1">Power Consumption</div>
                  <div className="text-xs font-mono text-neon">{telemetry.power.toFixed(1)} W</div>
                </div>
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <div className="text-[8px] text-white/40 uppercase mb-1">Manipulability</div>
                  <div className={`text-xs font-mono ${telemetry.isSingular ? 'text-red-500' : 'text-neon'}`}>
                    {telemetry.manipulability.toFixed(4)}
                  </div>
                </div>
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <div className="text-[8px] text-white/40 uppercase mb-1">J2 Torque</div>
                  <div className={`text-xs font-mono ${payload >= 30 ? 'text-orange-500' : 'text-neon'}`}>{telemetry.torque2.toFixed(1)} Nm</div>
                </div>
                <div className="bg-black/40 p-2 rounded border border-white/5">
                  <div className="text-[8px] text-white/40 uppercase mb-1">J3 Torque</div>
                  <div className={`text-xs font-mono ${payload >= 30 ? 'text-orange-500' : 'text-neon'}`}>{telemetry.torque3.toFixed(1)} Nm</div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={generateReport}
              className="flex-grow py-3 bg-neon/10 border border-neon/30 text-neon rounded font-mono text-[10px] uppercase font-bold hover:bg-neon hover:text-black transition-all flex items-center justify-center gap-2"
            >
              <FileText size={14} />
              Generate Technical Report
            </button>
            <button 
              onClick={clearPath}
              className="px-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded hover:bg-red-500 hover:text-white transition-all"
              title="Clear Path"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* System Controls */}
        <div className="mt-auto flex gap-2">
          <button 
            onClick={() => setPrecisionView(!precisionView)}
            className={`flex-1 py-3 border rounded font-mono text-[10px] uppercase font-bold transition-all ${precisionView ? 'bg-neon border-neon text-black' : 'bg-white/5 border-white/10 text-white/60'}`}
          >
            Precision View
          </button>
          <button 
            onClick={handleReset}
            className="px-6 bg-white/5 border border-white/10 text-white hover:bg-white/10 rounded transition-all"
          >
            <RefreshCw size={16} />
          </button>
        </div>

      </div>
    </div>
  );
};
