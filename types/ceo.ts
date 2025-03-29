export interface CEO {
  id: string;
  name: string;
  image: string;
  personality: string;
  prompts: {
    system: string;
    user: string;
  };
}

export interface CEOContextType {
  selectedCEO: CEO | null;
  setSelectedCEO: (ceo: CEO) => void;
} 