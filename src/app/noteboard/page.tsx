'use client';

import { Input } from "@/components/Input";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";

export default function NoteBoardPage() {
  return (
      <div className="min-h-screen w-full">
          <div className="max-w-6xl mx-auto">
            <SimpleEditor />
          </div>
          <div className="flex justify bottom-0 max-w-full items-center z-10">
            <Input />
          </div>
          <div className="absolute bottom-10 right-10 z-10">
           <h1 className="text-4xl font-semibold text-white font-grandhotel">Noted</h1>
          </div>
    </div>
  );
}