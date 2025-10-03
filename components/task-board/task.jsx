"use client";
import React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Icon } from "@iconify/react";
import {
  Calendar,
  ChevronDown,
  Link,
  List,
  MoreHorizontal,
} from "lucide-react";
import Image from "next/image";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";

import {
  Tooltip,
  TooltipArrow,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getWords } from "@/lib/utils";

import { deleteTaskAction, updateTaskAction } from "@/action/project-action";
import AssignMembers from "./common/assign-members";
import DeleteConfirmationDialog from "@/components/delete-confirmation-dialog";
import { cn } from "@/lib/utils";

const prioritiesColorMap = {
  high: "success",
  low: "destructive",
  medium: "warning",
};

const tagsColorMap = {
  development: "destructive",
  planning: "info",
  design: "success",
  "ui/ux": "warning",
};
// dnd
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const Task = ({ task, onUpdateTask }) => {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "Task", task },
  });
  const style = {
    transition,
    transform: CSS.Transform.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white rounded shadow p-4 mb-4 cursor-pointer border border-gray-200 hover:border-primary-500 transition-all"
      onClick={() => onUpdateTask && onUpdateTask(task)}
    >
      <div className="font-bold text-default-900 mb-1">{task.nombre}</div>
      <div className="text-xs text-default-600 mb-1">{task.email} | {task.telefono}</div>
      <div className="text-xs text-default-700 mb-2">{task.proyecto} | Prioridad: {task.prioridad}</div>
      <div className="text-xs text-default-500 mb-2">{task.fecha}</div>
      <div className="text-sm text-default-800">{task.mensaje}</div>
    </div>
  );
};

export default Task;
