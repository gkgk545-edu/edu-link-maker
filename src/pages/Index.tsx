import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { School, Users, Network, LogOut } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [staffCount, setStaffCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/auth");
      } else if (session) {
        checkAuth();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAuth = async () => {
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

    // Get staff count
    const { data: staffData, count } = await supabase
      .from("staff")
      .select("*", { count: "exact", head: false })
      .eq("user_id", user.id);

    setStaffCount(count || 0);
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              스쿨 비상연락망
            </h1>
            {profile && (
              <p className="text-xl text-muted-foreground mt-2">
                {profile.school_name} · {profile.admin_name}님 환영합니다
              </p>
            )}
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            로그아웃
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <School className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>학교 정보</CardTitle>
              <CardDescription>등록된 학교 정보</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-primary">{profile?.school_name}</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <CardTitle>교직원 수</CardTitle>
              <CardDescription>등록된 교직원 인원</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-secondary">{staffCount}명</p>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Network className="w-6 h-6 text-accent" />
              </div>
              <CardTitle>연락망 상태</CardTitle>
              <CardDescription>조직도 생성 상태</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-accent">
                {staffCount > 0 ? "활성화" : "대기중"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>교직원 정보 관리</CardTitle>
              <CardDescription>
                비상연락망에 포함될 교직원 정보를 입력하거나 수정하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/staff-input")}
                className="w-full"
                size="lg"
              >
                {staffCount > 0 ? "교직원 정보 수정" : "교직원 정보 입력"}
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>조직도 보기</CardTitle>
              <CardDescription>
                생성된 비상연락망 조직도를 확인하고 편집하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => navigate("/org-chart")}
                className="w-full"
                size="lg"
                variant="secondary"
                disabled={staffCount === 0}
              >
                조직도 보기
              </Button>
              {staffCount === 0 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  먼저 교직원 정보를 입력해주세요
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;