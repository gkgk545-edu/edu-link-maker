import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Trash2, Save, LogOut } from "lucide-react";

interface StaffMember {
  id: string;
  department: string;
  name: string;
  contact: string;
  position: "교장" | "교감" | "부서장" | "부원";
}

const StaffInput = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [staffList, setStaffList] = useState<StaffMember[]>([
    { id: crypto.randomUUID(), department: "", name: "", contact: "", position: "부원" }
  ]);
  const [isLoading, setIsLoading] = useState(false);

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

    // Load existing staff
    const { data: existingStaff } = await supabase
      .from("staff")
      .select("*")
      .eq("user_id", user.id);

    if (existingStaff && existingStaff.length > 0) {
      setStaffList(existingStaff.map(s => ({
        id: s.id,
        department: s.department,
        name: s.name,
        contact: s.contact,
        position: s.position as any
      })));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const addStaffMember = () => {
    setStaffList([
      ...staffList,
      { id: crypto.randomUUID(), department: "", name: "", contact: "", position: "부원" }
    ]);
  };

  const removeStaffMember = (id: string) => {
    if (staffList.length === 1) {
      toast.error("최소 1명의 교직원이 필요합니다.");
      return;
    }
    setStaffList(staffList.filter(staff => staff.id !== id));
  };

  const updateStaffMember = (id: string, field: keyof StaffMember, value: string) => {
    setStaffList(staffList.map(staff => 
      staff.id === id ? { ...staff, [field]: value } : staff
    ));
  };

  const handleSave = async () => {
    // Validation
    const emptyFields = staffList.some(s => !s.department || !s.name || !s.contact || !s.position);
    if (emptyFields) {
      toast.error("모든 필드를 입력해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      // Delete all existing staff
      await supabase
        .from("staff")
        .delete()
        .eq("user_id", user.id);

      // Insert new staff
      const staffData = staffList.map(s => ({
        user_id: user.id,
        department: s.department,
        name: s.name,
        contact: s.contact,
        position: s.position
      }));

      const { error } = await supabase
        .from("staff")
        .insert(staffData);

      if (error) throw error;

      toast.success("교직원 정보가 저장되었습니다!");
      navigate("/org-chart");
    } catch (error: any) {
      toast.error(error.message || "저장에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">교직원 정보 입력</h1>
            {profile && (
              <p className="text-muted-foreground mt-1">
                {profile.school_name} · {profile.admin_name}
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>교직원 목록</CardTitle>
            <CardDescription>
              비상연락망에 포함될 모든 교직원의 정보를 입력하세요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {staffList.map((staff, index) => (
              <Card key={staff.id} className="p-4 bg-muted/50">
                <div className="flex items-start gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>부서명</Label>
                      <Input
                        placeholder="예: 교무부"
                        value={staff.department}
                        onChange={(e) => updateStaffMember(staff.id, "department", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>이름</Label>
                      <Input
                        placeholder="예: 홍길동"
                        value={staff.name}
                        onChange={(e) => updateStaffMember(staff.id, "name", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>연락처</Label>
                      <Input
                        placeholder="예: 010-1234-5678"
                        value={staff.contact}
                        onChange={(e) => updateStaffMember(staff.id, "contact", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>직위</Label>
                      <Select
                        value={staff.position}
                        onValueChange={(value) => updateStaffMember(staff.id, "position", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="교장">교장</SelectItem>
                          <SelectItem value="교감">교감</SelectItem>
                          <SelectItem value="부서장">부서장</SelectItem>
                          <SelectItem value="부원">부원</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeStaffMember(staff.id)}
                    className="mt-8"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={addStaffMember}
                className="flex-1"
              >
                <Plus className="w-4 h-4 mr-2" />
                교직원 추가
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {isLoading ? "저장 중..." : "저장 및 연락망 생성"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffInput;