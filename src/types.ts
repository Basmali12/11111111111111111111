export interface AppConfig {
  appearance_mode: 'Dark' | 'Light';
  color_theme: 'blue' | 'green' | 'dark-blue';
  default_save_path: string;
  database_filename?: string;
  last_updated?: string;
}

export interface MilitaryRecord {
  seq: number;
  military_id: string;
  fullname: string;
  position: string;
  phone: string;
  // Comprehensive field mapping sourced from the supplied Excel workbook
  details?: Record<string, string>;
}

export type SimulatorView = 'home' | 'settings' | 'blank' | 'casualties' | 'weapons' | 'finance' | 'communications' | 'vehicles' | 'attendance';

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message: string;
}
