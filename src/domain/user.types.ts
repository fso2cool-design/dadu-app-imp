import { 
  // TODO: Add missing imports here
} from '../types';

export interface OrphanResidualItem {
  uid: string;
  detectedDocCount: number;
  sampleCollections: string[];
}

export interface UserStorageStats {
  classesCount: number;
  subjectsCount: number;
  studentsCount: number;
  assignmentsCount: number;
  meetingsCount: number;
  attendanceCount: number;
  gradesCount: number;
  totalDocuments: number;
}

