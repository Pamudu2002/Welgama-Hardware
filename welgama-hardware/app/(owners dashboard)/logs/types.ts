export type ActivityLogEntry = {
  id: number;
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  user: {
    id: number;
    username: string | null;
    role: string | null;
  } | null;
};
