"use client";
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Icon } from "@iconify/react";
import { Plus, Trash2, ExternalLink } from "lucide-react";

const ObraDocumentacion = ({ 
  docLinks, 
  onDocLinksChange, 
  editando 
}) => {
  const [nuevoLink, setNuevoLink] = useState("");

  const handleAgregarLink = () => {
    if (!nuevoLink.trim()) return;
    
    const link = {
      id: Date.now(),
      url: nuevoLink.trim(),
      titulo: `Documento ${docLinks.length + 1}`,
      fecha: new Date().toISOString().split('T')[0]
    };
    
    onDocLinksChange([...docLinks, link]);
    setNuevoLink("");
  };

  const handleEliminarLink = (id) => {
    onDocLinksChange(docLinks.filter(link => link.id !== id));
  };

  const handleTituloChange = (id, nuevoTitulo) => {
    onDocLinksChange(docLinks.map(link => 
      link.id === id ? { ...link, titulo: nuevoTitulo } : link
    ));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon icon="heroicons:document-text" className="w-5 h-5" />
          Documentación
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {editando && (
          <div className="flex gap-2">
            <Input
              value={nuevoLink}
              onChange={(e) => setNuevoLink(e.target.value)}
              placeholder="URL del documento o enlace"
              className="flex-1"
            />
            <Button
              onClick={handleAgregarLink}
              disabled={!nuevoLink.trim()}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Agregar
            </Button>
          </div>
        )}

        {docLinks.length > 0 ? (
          <div className="space-y-2">
            {docLinks.map((link) => (
              <div key={link.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className="flex-1">
                  {editando ? (
                    <Input
                      value={link.titulo}
                      onChange={(e) => handleTituloChange(link.id, e.target.value)}
                      className="mb-2"
                    />
                  ) : (
                    <h4 className="font-medium mb-1">{link.titulo}</h4>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span>{link.fecha}</span>
                    <span>•</span>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                    >
                      {link.url}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
                
                {editando && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEliminarLink(link.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Icon icon="heroicons:document-text" className="w-12 h-12 mx-auto mb-2 text-gray-300" />
            <p>No hay documentos adjuntos</p>
            {editando && (
              <p className="text-sm">Agrega enlaces o documentos usando el campo de arriba</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ObraDocumentacion;
