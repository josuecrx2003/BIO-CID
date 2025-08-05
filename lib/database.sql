-- Create software_keys table
CREATE TABLE IF NOT EXISTS software_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key_value VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  max_usage INTEGER DEFAULT NULL, -- NULL means unlimited usage
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create usage_logs table to track key usage
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  software_key_id UUID REFERENCES software_keys(id) ON DELETE CASCADE,
  iid TEXT NOT NULL,
  cid TEXT,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_software_keys_key_value ON software_keys(key_value);
CREATE INDEX IF NOT EXISTS idx_software_keys_active ON software_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_usage_logs_software_key_id ON usage_logs(software_key_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- Enable Row Level Security
ALTER TABLE software_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for software_keys
CREATE POLICY "Admin can do everything on software_keys" ON software_keys
  FOR ALL USING (auth.email() = 'admin@yourdomain.com');

CREATE POLICY "Public can read active software_keys" ON software_keys
  FOR SELECT USING (is_active = true);

-- Create policies for usage_logs
CREATE POLICY "Admin can read all usage_logs" ON usage_logs
  FOR SELECT USING (auth.email() = 'admin@yourdomain.com');

CREATE POLICY "Anyone can insert usage_logs" ON usage_logs
  FOR INSERT WITH CHECK (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_software_keys_updated_at 
  BEFORE UPDATE ON software_keys 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();