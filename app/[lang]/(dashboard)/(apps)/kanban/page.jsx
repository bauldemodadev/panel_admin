import { data as leads } from "../../(tables)/data-table/advanced/data/index";
import KanbanBreadCrumbs from "./bread-crumbs";
import TaskBoard from "@/components/task-board";

const estados = [
  { id: "nuevo", nombre: "Nuevo" },
  { id: "en seguimiento", nombre: "En seguimiento" },
  { id: "contactado", nombre: "Contactado" },
];

const Kanban = async () => {
  // Agrupar leads por estado
  const boards = estados.map((estado) => ({
    id: estado.id,
    name: estado.nombre,
  }));
  const tasks = leads.map((lead) => ({
    ...lead,
    boardId: lead.estado,
    title: lead.nombre,
    description: lead.mensaje,
  }));
  // No hay subtareas ni comentarios en leads
  const subTasks = [];
  const comments = [];
  return (
    <>
      {/* <div className="flex flex-wrap mb-7">
        <div className="text-xl font-medium text-default-900 flex-1">
          Kanban de Leads
        </div>
        <div className="flex-none">
          <KanbanBreadCrumbs />
        </div>
      </div> */}
      <TaskBoard
        boards={boards}
        tasks={tasks}
        subTasks={subTasks}
        comments={comments}
      />
    </>
  );
};

export default Kanban;
