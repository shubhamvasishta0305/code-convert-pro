import { useAuth, AuthProvider } from '@/contexts/AuthContext';
import AuthPage from './AuthPage';
import MainApp from './MainApp';

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  
  return isAuthenticated ? <MainApp /> : <AuthPage />;
};

const Index = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
