export interface CEO {
  id: string;
  name: string;
  prompt: string;
  character: string;
  style: string;
  image: string;
}

export interface CEOContextType {
  selectedCEO: CEO | null;
  setSelectedCEO: (ceo: CEO) => void;
} 