import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export default function WtafPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-700 to-blue-600 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full text-center space-y-8">
        <h1 className="text-5xl font-bold">
          What if <span className="bg-gradient-to-r from-orange-400 to-yellow-300 text-transparent bg-clip-text">vibecoding</span>,
          <br />but over <span className="bg-gradient-to-r from-green-400 to-teal-300 text-transparent bg-clip-text">SMS</span>?
        </h1>
        
        <div className="flex max-w-lg mx-auto">
          <input 
            type="text" 
            placeholder="wtaf code a delusional pitch deck" 
            className="flex-1 bg-white/20 text-white border-none rounded-l-lg p-4 text-lg focus:outline-none"
          />
          <button className="bg-green-400 text-gray-900 rounded-r-lg px-8 py-4 text-xl font-bold">
            GO
          </button>
        </div>
        
        <p className="text-lg text-white/80 mt-6">
          Painstakingly built in Cursor... so you can ship from your flip phone.
        </p>
      </div>
    </div>
  );
}
