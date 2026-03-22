/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, useAnimation, useInView, useSpring, useMotionValue } from 'motion/react';
import { 
  Cpu, 
  Code2, 
  Wrench, 
  Mail, 
  Phone, 
  Linkedin, 
  Github, 
  ExternalLink, 
  ChevronRight, 
  MapPin, 
  Download,
  Terminal,
  Layers,
  Award,
  Circle,
  User,
  BookOpen,
  Briefcase,
  Trophy,
  MessageSquare,
  FlaskConical,
  Box
} from 'lucide-react';
import { RoboticArmIK } from './components/DigitalTwin/RoboticArmIK';
import { WorkCellDashboard } from './components/DigitalTwin/WorkCellDashboard';
import { RoboticsTicker } from './components/RoboticsTicker';

// Custom Hook for Sequential Typewriter Effect
const useTypewriterSequence = (sequences: string[], speed: number = 100, initialDelay: number = 500) => {
  const [results, setResults] = useState<string[]>(sequences.map(() => ''));
  const [currentIndex, setCurrentIndex] = useState(-1);

  useEffect(() => {
    const timer = setTimeout(() => setCurrentIndex(0), initialDelay);
    return () => clearTimeout(timer);
  }, [initialDelay]);

  useEffect(() => {
    if (currentIndex < 0 || currentIndex >= sequences.length) return;

    let charIndex = 0;
    const targetText = sequences[currentIndex];
    
    const interval = setInterval(() => {
      setResults(prev => {
        const newResults = [...prev];
        newResults[currentIndex] = targetText.slice(0, charIndex + 1);
        return newResults;
      });
      charIndex++;

      if (charIndex >= targetText.length) {
        clearInterval(interval);
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
        }, 200); // Small pause between sequences
      }
    }, speed);

    return () => clearInterval(interval);
  }, [currentIndex, sequences, speed]);

  return { results, activeIndex: currentIndex };
};

const CustomCursor = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  
  const springConfig = { damping: 25, stiffness: 250, mass: 0.5 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, [cursorX, cursorY]);

  return (
    <>
      {/* Exact dot */}
      <motion.div
        className="fixed top-0 left-0 w-2 h-2 bg-neon rounded-full pointer-events-none z-[10000] mix-blend-difference"
        style={{
          x: cursorX,
          y: cursorY,
          translateX: '-50%',
          translateY: '-50%'
        }}
      />
      {/* Springy ring */}
      <motion.div
        className="fixed top-0 left-0 w-8 h-8 border-2 border-neon rounded-full pointer-events-none z-[10000] mix-blend-difference"
        style={{
          x: cursorXSpring,
          y: cursorYSpring,
          translateX: '-50%',
          translateY: '-50%'
        }}
      />
    </>
  );
};

const FadeInWhenVisible = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
};

const NavItem = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a 
    href={href} 
    className="text-sm font-medium text-white/60 hover:text-neon transition-colors uppercase tracking-widest"
  >
    {children}
  </a>
);

const SectionHeading = ({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) => (
  <FadeInWhenVisible>
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-2">
        <div className="h-px w-8 bg-neon"></div>
        <span className="text-neon font-mono text-xs uppercase tracking-[0.3em]">{subtitle}</span>
      </div>
      <h2 className="text-4xl md:text-5xl font-extrabold uppercase italic">{children}</h2>
    </div>
  </FadeInWhenVisible>
);

const SkillCard = ({ title, skills, icon: Icon }: { title: string; skills: string[]; icon: any }) => (
  <div className="glass-card p-6 rounded-none relative overflow-hidden group">
    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
      <Icon size={64} className="text-neon" />
    </div>
    <h3 className="text-neon font-mono text-sm mb-4 flex items-center gap-2">
      <Icon size={16} />
      {title}
    </h3>
    <div className="flex flex-wrap gap-2">
      {skills.map((skill) => (
        <span key={skill} className="px-3 py-1 bg-white/5 text-xs font-medium border border-white/10 hover:border-neon/50 transition-colors">
          {skill}
        </span>
      ))}
    </div>
  </div>
);

const TimelineItem = ({ title, org, period, description }: { title: string; org: string; period: string; description: string }) => (
  <div className="relative pl-8 pb-12 last:pb-0 group">
    <div className="absolute left-0 top-0 h-full w-px bg-white/10 group-last:h-2"></div>
    <div className="absolute left-[-4px] top-1.5 h-2 w-2 rounded-full bg-neon shadow-[0_0_8px_rgba(230,251,4,0.8)]"></div>
    
    <div className="flex flex-col md:flex-row md:items-center gap-2 mb-2">
      <span className="text-neon font-mono text-xs">{period}</span>
      <span className="hidden md:block text-white/20">|</span>
      <h3 className="text-xl font-bold text-white">{title}</h3>
    </div>
    <div className="text-white/60 font-medium mb-3 italic">{org}</div>
    <p className="text-white/40 text-sm leading-relaxed max-w-2xl">
      {description}
    </p>
  </div>
);

const ProjectCard = ({ title, category, description, tags, index, image, fallbackImage }: { title: string; category: string; description: string; tags: string[]; index: number; image: string; fallbackImage?: string }) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1 }}
    viewport={{ once: true }}
    className="glass-card flex flex-col h-full group overflow-hidden"
  >
    <div className="h-48 bg-white/5 relative overflow-hidden">
      <img 
        src={image} 
        alt={title}
        className="w-full h-full object-cover opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700"
        referrerPolicy="no-referrer"
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          const currentSrc = img.src;
          
          // Try JPG if PNG fails
          if (currentSrc.endsWith('.png')) {
            img.src = currentSrc.replace('.png', '.jpg');
          } 
          // If JPG fails (or other local files fail), use the fallbackImage
          else if (fallbackImage && currentSrc !== fallbackImage) {
            img.src = fallbackImage;
          }
        }}
      />
      <div className="absolute inset-0 bg-dark/40 group-hover:bg-transparent transition-colors duration-500"></div>
      <div className="absolute top-4 left-4">
        <span className="px-2 py-1 bg-neon text-dark text-[10px] font-bold uppercase tracking-tighter">
          {category}
        </span>
      </div>
    </div>
    <div className="p-6 flex flex-col flex-grow">
      <h3 className="text-xl font-bold mb-3 group-hover:text-neon transition-colors">{title}</h3>
      <p className="text-white/50 text-sm mb-6 flex-grow leading-relaxed">
        {description}
      </p>
      <div className="flex flex-wrap gap-2 mt-auto">
        {tags.map(tag => (
          <span key={tag} className="font-mono text-[10px] text-white/30 uppercase tracking-widest">
            #{tag}
          </span>
        ))}
      </div>
    </div>
  </motion.div>
);

const RoboticBackground = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    {/* Background Image Layer */}
    <div className="absolute right-0 top-0 w-full h-full lg:w-3/4 opacity-15">
      <img 
        src="robot background.png" 
        alt="Robotic Background"
        className="w-full h-full object-cover object-right"
        style={{
          maskImage: 'linear-gradient(to left, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to left, black 40%, transparent 100%)'
        }}
      />
    </div>

    {/* Large Robotic Arm Silhouette */}
    <div className="opacity-[0.05]">
      <svg viewBox="0 0 800 800" className="absolute -right-20 top-1/4 w-[800px] h-[800px] text-neon fill-none stroke-current stroke-[1]">
        <path d="M100,700 L200,700 L250,550 L450,550 L550,350 L700,350 L750,250 L750,150" />
        <circle cx="250" cy="550" r="15" />
        <circle cx="450" cy="550" r="15" />
        <circle cx="550" cy="350" r="15" />
        <rect x="680" y="330" width="40" height="40" />
        <path d="M750,150 L780,120 M750,150 L720,120" strokeWidth="2" />
        {/* Joint details */}
        <circle cx="250" cy="550" r="5" fill="currentColor" />
        <circle cx="450" cy="550" r="5" fill="currentColor" />
        <circle cx="550" cy="350" r="5" fill="currentColor" />
      </svg>
    </div>

    {/* Technical Grid & Coordinates */}
    <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(to right, rgba(230, 251, 4, 0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(230, 251, 4, 0.1) 1px, transparent 1px)', backgroundSize: '100px 100px' }}></div>
    
    {/* Floating Technical Labels */}
    <div className="absolute top-24 left-10 font-mono text-[10px] text-neon uppercase tracking-widest opacity-70">
      [ PARTH PRASHANT SAIL ]<br />
      [ AUTOMATION AND ROBOTICS ]
    </div>
    
    <div className="absolute bottom-24 right-10 font-mono text-[10px] text-neon uppercase tracking-widest opacity-70 text-right">
      [ COORDINATE_X: 124.55 ]<br />
      [ COORDINATE_Y: 892.10 ]<br />
      [ ROTATION_Z: 12.4° ]
    </div>

    {/* Circuit Lines */}
    <svg className="absolute top-0 left-0 w-full h-full text-neon opacity-30" viewBox="0 0 1000 1000">
      <path d="M0,100 L100,100 L150,150 L300,150 M500,0 L500,200 L550,250 L800,250" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle cx="300" cy="150" r="3" fill="currentColor" />
      <circle cx="800" cy="250" r="3" fill="currentColor" />
    </svg>
  </div>
);

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isBlueprint, setIsBlueprint] = useState(false);
  
  const sequences = useMemo(() => [
    ">_ Automation and Robotics Engineer"
  ], []);

  const { results, activeIndex } = useTypewriterSequence(sequences, 100, 1000);

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = formData.get('name');
    const email = formData.get('email');
    const message = formData.get('message');
    
    const subject = encodeURIComponent(`Portfolio Inquiry from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`);
    
    window.location.href = `mailto:parthsail288@gmail.com?subject=${subject}&body=${body}`;
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isBlueprint) {
      document.body.classList.add('blueprint-mode');
    } else {
      document.body.classList.remove('blueprint-mode');
    }
  }, [isBlueprint]);

  return (
    <div className="min-h-screen selection:bg-neon selection:text-dark circuit-bg relative">
      <CustomCursor />
      <RoboticBackground />
      
      {/* Scanline Effect */}
      <div className="scanline" />

      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-dark/80 backdrop-blur-md border-b border-white/5 py-4' : 'bg-transparent py-8'}`}>
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-neon flex items-center justify-center">
              <span className="text-dark font-black text-xl">P</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <NavItem href="#about">About</NavItem>
            <NavItem href="#skills">Skills</NavItem>
            <NavItem href="#lab">Lab</NavItem>
            <NavItem href="#dashboard">Dashboard</NavItem>
            <NavItem href="#experience">Experience</NavItem>
            <NavItem href="#projects">Projects</NavItem>
            <NavItem href="#contact">Contact</NavItem>
            
            {/* Drafting View Toggle */}
            <div className="ml-4 flex items-center gap-3 border-l border-white/10 pl-8">
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/40">Drafting View</span>
              <button 
                onClick={() => setIsBlueprint(!isBlueprint)}
                className={`w-10 h-5 rounded-full transition-colors relative ${isBlueprint ? 'bg-white' : 'bg-white/10'}`}
              >
                <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${isBlueprint ? 'left-6 bg-dark' : 'left-1 bg-white/40'}`} />
              </button>
            </div>
          </div>
          <button className="md:hidden text-neon">
            <Terminal size={24} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20 pb-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 w-full">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-6 inline-flex items-center gap-2 px-3 py-1 bg-neon/10 border border-neon/20 rounded-full"
          >
            <span className="flex h-2 w-2 rounded-full bg-neon animate-pulse"></span>
            <span className="text-neon font-mono text-[10px] uppercase tracking-widest">
              System.Ready | Open_To_Internships
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-6xl md:text-8xl lg:text-9xl font-black uppercase italic leading-[0.85] mb-8"
          >
            Parth <br />
            <span className="text-neon">Prashant</span> <br />
            Sail
          </motion.h1>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col md:flex-row md:items-center gap-6 md:gap-12 mb-12"
          >
            <div className="flex items-center gap-3 text-neon">
              <Terminal size={20} className="text-neon" />
              <span className="font-mono text-sm md:text-lg tracking-tight min-h-[1.5em]">
                {results[0]}
                {(activeIndex === 0 || activeIndex === 1) && <span className="terminal-cursor"></span>}
              </span>
            </div>
            <div className="flex items-center gap-3 text-white/60">
              <MapPin size={20} className="text-neon" />
              <span className="font-mono text-sm tracking-tight italic">
                Pune, India
              </span>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex flex-wrap gap-4"
          >
            <a 
              href="#projects" 
              className="px-8 py-4 bg-neon text-dark font-bold uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2 group"
            >
              View Projects
              <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </a>
            <a 
              href="/resume.pdf" 
              download="Parth_Sail_Resume.pdf"
              className="px-8 py-4 border border-neon text-neon font-bold uppercase tracking-widest hover:bg-neon/10 transition-colors flex items-center gap-2"
            >
              Download Resume
             <Download size={18} />
            </a>
          </motion.div>
        </div>

        {/* Floating Robotic Arm Silhouette (Decorative) */}
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 opacity-5 pointer-events-none hidden lg:block">
          <svg viewBox="0 0 200 200" className="w-full h-full text-neon">
            <path d="M40,160 L60,160 L60,140 L80,140 L80,100 L120,60 L140,60 L140,40 L160,40" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="40" cy="160" r="5" fill="currentColor" />
            <circle cx="80" cy="140" r="5" fill="currentColor" />
            <circle cx="120" cy="60" r="5" fill="currentColor" />
            <circle cx="160" cy="40" r="5" fill="currentColor" />
          </svg>
        </div>
      </section>

      {/* About Me Section */}
      <section id="about" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <SectionHeading subtitle="Identity">About Me</SectionHeading>
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <FadeInWhenVisible>
              <div className="relative group">
                <div className="absolute -inset-4 bg-neon/20 rounded-full blur-2xl group-hover:bg-neon/30 transition-all duration-500"></div>
                <div className="relative w-64 h-64 md:w-80 md:h-80 mx-auto rounded-full border-4 border-neon p-1 shadow-[0_0_30px_rgba(230,251,4,0.5)] overflow-hidden bg-dark flex items-center justify-center">
                  <img 
                    src="profile.jpg.jpg" 
                    alt="Parth Prashant Sail" 
                    className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                    onError={(e) => {
                      const img = e.target as HTMLImageElement;
                      if (img.src.endsWith('profile.jpg.jpg')) {
                        img.src = 'profile.jpg';
                      }
                    }}
                  />
                </div>
              </div>
            </FadeInWhenVisible>
            <FadeInWhenVisible delay={0.2}>
              <div className="space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-neon text-dark font-bold text-xs uppercase tracking-widest mb-4">
                  <Award size={14} />
                  CGPA: 7.86
                </div>
                <p className="text-xl text-white/80 leading-relaxed italic">
                  "I am an Automation and Robotics Engineer. I specialize in bridging mechanical design with intelligent embedded control."
                </p>
                <p className="text-white/60 leading-relaxed">
                  My work focuses on the synergy between mechanical precision and algorithmic intelligence. From analyzing robotic welding productivity at Kirloskar Pneumatic to building autonomous pick-and-place arms, I am driven by creating high-efficiency industrial solutions that push the boundaries of modern manufacturing.
                </p>
              </div>
            </FadeInWhenVisible>
          </div>
        </div>
      </section>

      {/* Technical Arsenal Section */}
      <section id="skills" className="py-32 px-6 bg-charcoal/30">
        <div className="max-w-7xl mx-auto">
          <SectionHeading subtitle="Capabilities">Technical Arsenal</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FadeInWhenVisible delay={0.1}>
              <SkillCard 
                title="CAD & ANALYSIS" 
                icon={Layers}
                skills={['AutoCAD', 'Fusion 360', 'Ansys Workbench']} 
              />
            </FadeInWhenVisible>
            <FadeInWhenVisible delay={0.2}>
              <SkillCard 
                title="PROGRAMMING" 
                icon={Code2}
                skills={['Python', 'C', 'C++', 'MATLAB']} 
              />
            </FadeInWhenVisible>
            <FadeInWhenVisible delay={0.3}>
              <SkillCard 
                title="HARDWARE" 
                icon={Cpu}
                skills={['Arduino IDE', 'Embedded Systems', 'RF Communication']} 
              />
            </FadeInWhenVisible>
          </div>
        </div>
      </section>

      {/* Digital Twin Lab Section */}
      <section id="lab" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <SectionHeading subtitle="Simulation">Robotic Arm IK Solver</SectionHeading>
          <FadeInWhenVisible>
            <div className="glass-card overflow-hidden rounded-xl border border-white/10 shadow-2xl">
              <RoboticArmIK isBlueprint={isBlueprint} setIsBlueprint={setIsBlueprint} />
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* Work-Cell Dashboard Section */}
      <section id="dashboard" className="py-32 px-6 relative z-10 bg-charcoal/20">
        <div className="max-w-7xl mx-auto">
          <SectionHeading subtitle="Digital Twin">Robotic Work-Cell Dashboard</SectionHeading>
          <FadeInWhenVisible>
            <div className="glass-card overflow-hidden rounded-xl border border-white/10 shadow-2xl">
              <WorkCellDashboard />
            </div>
          </FadeInWhenVisible>
        </div>
      </section>

      {/* Journey & Milestones Section */}
      <section id="experience" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <SectionHeading subtitle="Timeline">Journey & Milestones</SectionHeading>
          <div className="max-w-4xl mx-auto">
            <FadeInWhenVisible>
              <TimelineItem 
                period="Jan 2026 — Feb 2026"
                title="Automation & Manufacturing Intern"
                org="Kirloskar Pneumatic Company Limited"
                description="Analyzed pipe preparation and ASME-based welding practices; conducted productivity comparison of manual vs. robotic welding, and reviewed workflow efficiency."
              />
            </FadeInWhenVisible>
            <FadeInWhenVisible delay={0.1}>
              <TimelineItem 
                period="Sep 2025 — Present"
                title="Documentation Head"
                org="Roboclub"
                description="Managing technical and overall club records to ensure knowledge transfer and organizational efficiency."
              />
            </FadeInWhenVisible>
            <FadeInWhenVisible delay={0.2}>
              <TimelineItem 
                period="Oct 2024 — Present"
                title="Tech Team Data Handling"
                org="Forengers Foundation"
                description="Managed data handling operations for an NGO to streamline data access and improving drive ownership."
              />
            </FadeInWhenVisible>
            <FadeInWhenVisible delay={0.3}>
              <TimelineItem 
                period="2024 — 2025"
                title="Cultural: Actor & Backstage Support"
                org="Firodiya Karandak & Dajikaka Gadgil Karandak"
                description="Contributed to high-stakes cultural competitions, demonstrating teamwork and adaptability."
              />
            </FadeInWhenVisible>
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-32 px-6 bg-charcoal/30 relative z-10">
        <div className="max-w-7xl mx-auto">
          <SectionHeading subtitle="Portfolio">Featured Projects</SectionHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ProjectCard 
              index={1}
              category="Robotics"
              title="Autonomous Robotic Arm"
              image="arm.png"
              fallbackImage="https://images.unsplash.com/photo-1565514020179-026b92b84bb6?auto=format&fit=crop&q=80&w=800&h=600"
              description="Developed a 4-DOF robotic arm for production line simulation with precise object handling capabilities. Integrated 6-axis movement logic for industrial simulation."
              tags={['High-torque servos', 'IR sensors', 'Arduino']}
            />
            <ProjectCard 
              index={2}
              category="Security"
              title="Intelligent Security System"
              image="security.png"
              fallbackImage="https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800&h=600"
              description="A multi-layered security infrastructure utilizing optical intrusion detection and real-time motion sensing. Features high-tech laser grid simulation."
              tags={['Optical intrusion', 'Keypad access', 'Embedded C']}
            />
            <ProjectCard 
              index={3}
              category="Competition"
              title="Mindspark Robotica 2025"
              image="mindspark.png"
              fallbackImage="https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=800&h=600"
              description="Ranked 6th in the national-level Robo Falconry event. Focused on high-precision drone navigation and quadcopter stability control."
              tags={['Drone Control', 'Quadcopter', 'Navigation']}
            />
            <ProjectCard 
              index={4}
              category="Competition"
              title="Engineering Today 2025"
              image="engineering today.png"
              fallbackImage="https://images.unsplash.com/photo-1535378917042-10a22c95931a?auto=format&fit=crop&q=80&w=800&h=600"
              description="Fabricated a competitive platform with custom RF communication protocols for high-speed Robo Soccer matches."
              tags={['RF Communication', 'Robo Soccer', 'Hardware']}
            />
            <ProjectCard 
              index={5}
              category="UI/UX Design"
              title="SIH 2025"
              image="project5.jpg"
              fallbackImage="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800&h=600"
              description="Developed high-fidelity Figma prototypes for an AI-powered personalized learning platform. Focused on intuitive dashboard design."
              tags={['Figma', 'UI/UX', 'AI Dashboard']}
            />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-32 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <SectionHeading subtitle="Communication">Let's Connect</SectionHeading>
          <div className="glass-card p-12 md:p-16 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon/5 -mr-32 -mt-32 rounded-full blur-3xl"></div>
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <div>
                <h3 className="text-3xl font-bold mb-6 italic uppercase">Get in Touch</h3>
                <p className="text-white/60 text-lg mb-12 leading-relaxed">
                  I'm currently looking for internship opportunities in automation and robotics. 
                  Reach out if you'd like to collaborate or just chat about tech.
                </p>
                
                <div className="space-y-8">
                  <div className="flex items-center gap-6 group">
                    <div className="w-12 h-12 bg-neon/10 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                      <Mail className="text-neon" size={20} />
                    </div>
                    <div>
                      <div className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-1">Email</div>
                      <a href="mailto:parthsail288@gmail.com" className="text-xl font-bold hover:text-neon transition-colors">parthsail288@gmail.com</a>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 group">
                    <div className="w-12 h-12 bg-neon/10 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                      <Phone className="text-neon" size={20} />
                    </div>
                    <div>
                      <div className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-1">Phone</div>
                      <a href="tel:+918208677969" className="text-xl font-bold hover:text-neon transition-colors">+91 8208677969</a>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 group">
                    <div className="w-12 h-12 bg-neon/10 flex items-center justify-center group-hover:bg-neon/20 transition-colors">
                      <Linkedin className="text-neon" size={20} />
                    </div>
                    <div>
                      <div className="text-white/40 font-mono text-[10px] uppercase tracking-widest mb-1">LinkedIn</div>
                      <a href="https://www.linkedin.com/in/parth-sail-625807206" target="_blank" className="text-xl font-bold hover:text-neon transition-colors">LinkedIn Profile</a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="relative">
                <div className="absolute -inset-4 bg-neon/5 rounded-xl blur-xl"></div>
                <form className="relative space-y-6" onSubmit={handleContactSubmit}>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-white/40 font-mono text-[10px] uppercase tracking-widest">Name</label>
                      <input 
                        name="name"
                        type="text" 
                        required
                        className="w-full bg-white/5 border border-white/10 p-4 focus:border-neon outline-none transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-white/40 font-mono text-[10px] uppercase tracking-widest">Email</label>
                      <input 
                        name="email"
                        type="email" 
                        required
                        className="w-full bg-white/5 border border-white/10 p-4 focus:border-neon outline-none transition-colors"
                        placeholder="john@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-white/40 font-mono text-[10px] uppercase tracking-widest">Message</label>
                    <textarea 
                      name="message"
                      rows={4}
                      required
                      className="w-full bg-white/5 border border-white/10 p-4 focus:border-neon outline-none transition-colors resize-none"
                      placeholder="Your message here..."
                    ></textarea>
                  </div>
                  <button type="submit" className="w-full py-4 bg-neon text-dark font-bold uppercase tracking-widest hover:bg-white transition-colors shadow-[0_0_15px_rgba(230,251,4,0.3)]">
                    Send Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
<footer className="py-24 px-6 border-t border-white/5">
  <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 bg-neon flex items-center justify-center">
        <span className="text-dark font-black text-sm">P</span>
      </div>
      <span className="text-white/40 font-mono text-[10px] uppercase tracking-widest">
        © 2026 Parth Prashant Sail
      </span>
    </div>
    <div className="flex gap-6">
      <a 
        href="https://github.com/parthsail288-bit" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-white/40 hover:text-neon transition-colors"
      >
        <Github size={18} />
      </a>
      <a 
        href="https://www.linkedin.com/in/parth-sail-625807206" 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-white/40 hover:text-neon transition-colors"
      >
        <Linkedin size={18} />
      </a>
      <a 
        href="mailto:parthsail288@gmail.com" 
        className="text-white/40 hover:text-neon transition-colors"
      >
        <Mail size={18} />
      </a>
    </div>
  </div>
</footer>

      {/* Robotics News Ticker */}
      <RoboticsTicker isBlueprint={isBlueprint} />
    </div>
  );
}
