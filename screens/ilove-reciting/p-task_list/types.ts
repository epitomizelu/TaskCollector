

export type TaskType = 'recite' | 'review';

export interface Task {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  completed: boolean;
  completedAt: string | null;
  estimatedTime: string | null;
}

export interface TaskItemProps {
  task: Task;
  onPress: () => void;
}

