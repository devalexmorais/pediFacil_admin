import React from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <>
      <Sidebar />
      <div className="content">
        <div className="content-wrapper">
          {children}
        </div>
      </div>
    </>
  );
};

export default Layout; 