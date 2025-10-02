import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Save, Share2, Printer, LogOut, Edit } from "lucide-react";
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
} from "reactflow";
import "reactflow/dist/style.css";
import { toPng } from "html-to-image";

interface StaffMember {
  id: string;
  department: string;
  name: string;
  contact: string;
  position: "교장" | "교감" | "부서장" | "부원";
}

const OrgChartContent = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }
    setUser(user);

    // Get profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    
    setProfile(profileData);

    // Get staff
    const { data: staffData } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", user.id);

    if (!staffData || staffData.length === 0) {
      toast.error("교직원 정보를 먼저 입력해주세요.");
      navigate("/staff-input");
      return;
    }

    setStaff(staffData as StaffMember[]);
    
    // Check for saved layout
    const { data: layoutData } = await supabase
      .from("org_layout")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (layoutData?.layout_data) {
      const savedLayout = layoutData.layout_data as any;
      setNodes(savedLayout.nodes || []);
      setEdges(savedLayout.edges || []);
    } else {
      generateOrgChart(staffData as StaffMember[]);
    }
  };

  const generateOrgChart = (staffData: StaffMember[]) => {
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let yOffset = 0;
    const xSpacing = 250;
    const ySpacing = 150;

    // Level 1: 교장
    const principals = staffData.filter(s => s.position === "교장");
    principals.forEach((p, i) => {
      newNodes.push({
        id: p.id,
        type: "default",
        position: { x: 400, y: yOffset },
        data: { 
          label: (
            <div className="p-4 bg-white rounded-lg shadow-md border-2 border-primary">
              <div className="font-bold text-primary text-lg">{p.position}</div>
              <div className="font-semibold mt-1">{p.name}</div>
              <div className="text-sm text-muted-foreground">{p.department}</div>
              <div className="text-sm mt-1">{p.contact}</div>
            </div>
          )
        },
      });
    });

    yOffset += ySpacing;

    // Level 2: 교감
    const vps = staffData.filter(s => s.position === "교감");
    const vpX = 400 - ((vps.length - 1) * xSpacing) / 2;
    vps.forEach((vp, i) => {
      newNodes.push({
        id: vp.id,
        type: "default",
        position: { x: vpX + i * xSpacing, y: yOffset },
        data: { 
          label: (
            <div className="p-4 bg-white rounded-lg shadow-md border-2 border-secondary">
              <div className="font-bold text-secondary text-lg">{vp.position}</div>
              <div className="font-semibold mt-1">{vp.name}</div>
              <div className="text-sm text-muted-foreground">{vp.department}</div>
              <div className="text-sm mt-1">{vp.contact}</div>
            </div>
          )
        },
      });
      
      if (principals.length > 0) {
        newEdges.push({
          id: `e-${principals[0].id}-${vp.id}`,
          source: principals[0].id,
          target: vp.id,
          animated: true,
        });
      }
    });

    yOffset += ySpacing;

    // Level 3: 부서장
    const managers = staffData.filter(s => s.position === "부서장");
    const managerX = 400 - ((managers.length - 1) * xSpacing) / 2;
    managers.forEach((m, i) => {
      newNodes.push({
        id: m.id,
        type: "default",
        position: { x: managerX + i * xSpacing, y: yOffset },
        data: { 
          label: (
            <div className="p-4 bg-white rounded-lg shadow-md border-2 border-accent">
              <div className="font-bold text-accent text-lg">{m.position}</div>
              <div className="font-semibold mt-1">{m.name}</div>
              <div className="text-sm text-muted-foreground">{m.department}</div>
              <div className="text-sm mt-1">{m.contact}</div>
            </div>
          )
        },
      });

      if (vps.length > 0) {
        newEdges.push({
          id: `e-${vps[Math.floor(i / (managers.length / vps.length || 1))].id}-${m.id}`,
          source: vps[Math.floor(i / (managers.length / vps.length || 1))].id,
          target: m.id,
          animated: true,
        });
      }
    });

    yOffset += ySpacing;

    // Level 4: 부원
    const members = staffData.filter(s => s.position === "부원");
    members.forEach((member, i) => {
      // Find matching manager by department
      const manager = managers.find(m => m.department === member.department);
      const managerIndex = managers.indexOf(manager!);
      
      const baseX = managerX + managerIndex * xSpacing;
      const departmentMembers = members.filter(m => m.department === member.department);
      const memberIndexInDept = departmentMembers.indexOf(member);
      
      newNodes.push({
        id: member.id,
        type: "default",
        position: { 
          x: baseX - ((departmentMembers.length - 1) * 100) / 2 + memberIndexInDept * 100, 
          y: yOffset 
        },
        data: { 
          label: (
            <div className="p-3 bg-white rounded-lg shadow-sm border border-border">
              <div className="font-bold text-sm">{member.position}</div>
              <div className="font-semibold text-sm mt-1">{member.name}</div>
              <div className="text-xs text-muted-foreground">{member.department}</div>
              <div className="text-xs mt-1">{member.contact}</div>
            </div>
          )
        },
      });

      if (manager) {
        newEdges.push({
          id: `e-${manager.id}-${member.id}`,
          source: manager.id,
          target: member.id,
        });
      }
    });

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const handleSaveLayout = async () => {
    if (!user) return;

    try {
      const layoutData = { nodes, edges };

      const { error } = await supabase
        .from("org_layout")
        .upsert({
          user_id: user.id,
          layout_data: layoutData as any,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      toast.success("레이아웃이 저장되었습니다!");
    } catch (error: any) {
      toast.error(error.message || "저장에 실패했습니다.");
    }
  };

  const handleDownloadImage = async () => {
    const element = document.querySelector(".react-flow") as HTMLElement;
    if (!element) return;

    try {
      const dataUrl = await toPng(element, {
        backgroundColor: "#ffffff",
        width: element.offsetWidth,
        height: element.offsetHeight,
      });

      const link = document.createElement("a");
      link.download = `비상연락망_${profile?.school_name || "학교"}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("이미지가 다운로드되었습니다!");
    } catch (error) {
      toast.error("이미지 다운로드에 실패했습니다.");
    }
  };

  const handlePrint = () => {
    window.print();
    toast.success("인쇄 대화상자가 열렸습니다.");
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: "학교 비상연락망",
          text: `${profile?.school_name} 비상연락망`,
          url: url,
        });
        toast.success("공유되었습니다!");
      } catch (error) {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast.success("링크가 클립보드에 복사되었습니다!");
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="flex justify-between items-center p-4 border-b bg-card">
        <div>
          <h1 className="text-2xl font-bold text-primary">비상연락망 조직도</h1>
          {profile && (
            <p className="text-sm text-muted-foreground">
              {profile.school_name} · {profile.admin_name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/staff-input")}>
            <Edit className="w-4 h-4 mr-2" />
            교직원 수정
          </Button>
          <Button variant="outline" size="sm" onClick={handleSaveLayout}>
            <Save className="w-4 h-4 mr-2" />
            레이아웃 저장
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadImage}>
            <Download className="w-4 h-4 mr-2" />
            이미지 저장
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            인쇄
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            공유
          </Button>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-muted/20"
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    </div>
  );
};

const OrgChart = () => {
  return (
    <ReactFlowProvider>
      <OrgChartContent />
    </ReactFlowProvider>
  );
};

export default OrgChart;