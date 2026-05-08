export type IssueStatus = "Pending Review" | "Scheduled" | "In Progress" | "Resolved";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface Issue {
  id: string;
  title: string;
  category: string;
  location: string;
  timeAdded: string;
  status: IssueStatus;
  priority: Priority;
  imageUrl?: string;
  upvotes?: number;
}

export const mockIssues: Issue[] = [
  {
    id: "1",
    title: "Broken Water Pipe",
    category: "Utility",
    location: "Sector 4, Greenfield Road near Mall",
    timeAdded: "12 mins ago",
    status: "Pending Review",
    priority: "URGENT",
  },
  {
    id: "2",
    title: "Street Light Malfunction",
    category: "Infrastructure",
    location: "East Avenue, Block B-12 Street",
    timeAdded: "1 hour ago",
    status: "Scheduled",
    priority: "MEDIUM",
  },
  {
    id: "3",
    title: "Waste Collection Delay",
    category: "Sanitation",
    location: "North Square Community Area",
    timeAdded: "3 hours ago",
    status: "In Progress",
    priority: "LOW",
  },
  {
    id: "4",
    title: "Large Pothole",
    category: "Road Maintenance",
    location: "West Side Highway",
    timeAdded: "1 day ago",
    status: "In Progress",
    priority: "HIGH",
    imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=400",
  },
  {
    id: "5",
    title: "Overflowing Bin",
    category: "Sanitation",
    location: "Main St, Sector 4",
    timeAdded: "2 days ago",
    status: "Pending Review",
    priority: "MEDIUM",
  }
];
