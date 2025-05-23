'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faFileLines } from "@fortawesome/free-solid-svg-icons";

interface Transcript {
  _id: string;
  transcript: string;
  dateAdded: string;
  idsOfInsertedTasks: string[];
}

interface Task {
  _id: string;
  action_item: string;
  start_datetime: string;
  end_datetime: string;
  sent: boolean;
  completed: boolean;
}

const TranscriptTasksPage = () => {
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [showFullTranscript, setShowFullTranscript] = useState(false);

  // Fetch transcripts from /api/data/retrieve
  useEffect(() => {
    fetch('/api/data/retrieve')
      .then((res) => res.json())
      .then((apiData) => {
        const allTranscripts = apiData.allTranscripts;
        setTranscripts(allTranscripts);
        if (allTranscripts && allTranscripts.length > 0) {
          setSelectedTranscript(allTranscripts[0]);
        }
      })
      .catch((err) => console.error('Error fetching transcripts:', err));
  }, []);

  // Fetch tasks whenever the selected transcript changes
  useEffect(() => {
    if (selectedTranscript) {
      const taskIds = selectedTranscript.idsOfInsertedTasks || [];
      if (taskIds.length === 0) {
        setTasks((prev) => ({ ...prev, [selectedTranscript._id]: [] }));
      } else {
        fetch('/api/data/find-tasks-by-id', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tasks_ids: taskIds }),
        })
          .then((res) => res.json())
          .then((data) => {
            console.log(`Fetched tasks: ${JSON.stringify(data)}`);
            setTasks((prev) => ({ ...prev, [selectedTranscript._id]: data.tasks_to_return }));
          })
          .catch((err) => console.error('Error fetching tasks:', err));
      }
    }
  }, [selectedTranscript]);

  const updateTask = (updatedTask: any) => {
    fetch('/api/data/updateTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTask),
    })
      .then((res) => res.json())
      .then((result) => console.log('Task updated:', result))
      .catch((err) => console.error('Error updating task:', err));
  };

  const handleCheckboxChange = (taskId: any, checked: any) => {
    if (!selectedTranscript) return;
    const transcriptId = selectedTranscript._id;
    const updatedTasksForTranscript = (tasks[transcriptId] || []).map((task) => {
      if (task._id === taskId) {
        const updatedTask = { ...task, completed: checked };
        updateTask(updatedTask);
        return updatedTask;
      }
      return task;
    });
    setTasks({ ...tasks, [transcriptId]: updatedTasksForTranscript });
  };

  const handleAddTask = () => {
    if (!selectedTranscript) return;
    const transcriptId = selectedTranscript._id;
    const newTask = {
      _id: Date.now().toString(), // temporary id
      action_item: 'New Action Item',
      start_datetime: new Date().toISOString(),
      end_datetime: new Date(Date.now() + 3600000).toISOString(),
      sent: false,
      completed: false,
    };

    // Update tasks locally
    const updatedTasksForTranscript = [...(tasks[transcriptId] || []), newTask];
    setTasks({ ...tasks, [transcriptId]: updatedTasksForTranscript });

    // Update transcript's task IDs locally
    const updatedTranscripts = transcripts.map((t) => {
      if (t._id === transcriptId) {
        return { ...t, idsOfInsertedTasks: [...(t.idsOfInsertedTasks || []), newTask._id] };
      }
      return t;
    });
    setTranscripts(updatedTranscripts);

    // Send new task to backend
    fetch('/api/data/addTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
      .then((res) => res.json())
      .then((result) => console.log('Task added:', result))
      .catch((err) => console.error('Error adding task:', err));
  };

  const handleDeleteTask = (taskId: any) => {
    if (!confirm("Are You Sure You Want to Delete?")) return;
    if (!selectedTranscript) return;
    const transcriptId = selectedTranscript._id;
    const updatedTasksForTranscript = (tasks[transcriptId] || []).filter((task) => task._id !== taskId);
    setTasks({ ...tasks, [transcriptId]: updatedTasksForTranscript });

    const updatedTranscripts = transcripts.map((t) => {
      if (t._id === transcriptId) {
        return { ...t, idsOfInsertedTasks: (t.idsOfInsertedTasks || []).filter((id) => id !== taskId) };
      }
      return t;
    });
    setTranscripts(updatedTranscripts);

    fetch('/api/data/deleteTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: taskId }),
    })
      .then((res) => res.json())
      .then((result) => console.log('Task deleted:', result))
      .catch((err) => console.error('Error deleting task:', err));
  };

  if (!selectedTranscript) {
    return <div>Loading...</div>;
  }

  const tasksForTranscript = tasks[selectedTranscript._id] || [];
  const maxLength = 100;
  const transcriptText = selectedTranscript.transcript;
  const displayTranscript =
    showFullTranscript || transcriptText.length <= maxLength
      ? transcriptText
      : transcriptText.slice(0, maxLength) + '...';

  return (
    <div className="container">
      {/* Transcript Tabs */}
      <div className="tabs">
        {transcripts.map((t) => (
          <button
            key={t._id}
            onClick={() => {
              setSelectedTranscript(t);
              setShowFullTranscript(false);
            }}
            style={{
              padding: '10px',
              backgroundColor: t._id === selectedTranscript._id ? '#000000' : '#fff',
              color: t._id === selectedTranscript._id ? '#fff' : '#000',
              border: '1px solid #ccc',
              borderRadius: '8px',
            }}
          >
            {new Date(t.dateAdded).toLocaleDateString()} ({(t.idsOfInsertedTasks || []).length} tasks)
          </button>
        ))}
      </div>

      {/* Transcript Display */}
      <div className="transcript-display">
        <h2 className="text-3xl text-center mb-2">Transcript</h2>
        <div className="transcript-box" style={{ maxHeight: showFullTranscript ? '1000px' : '100px' }}>
          {displayTranscript}
        </div>
        {transcriptText.length > maxLength && (
          <button
            onClick={() => setShowFullTranscript(!showFullTranscript)}
            className="mt-2 text-blue-200 underline transition-opacity duration-300 ease-in-out"
          >
            {showFullTranscript ? '^ Show Less ^' : 'v Show More v'}
          </button>
        )}
      </div>

      {/* Tasks Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Done</th>
              <th>Action Item</th>
              <th>Start</th>
              <th>End</th>
              <th>Reminded</th>
              <th>Chat</th>
              <th>Delete</th>
            </tr>
          </thead>
          <tbody>
            {tasksForTranscript.map((task) => (
              <tr key={task._id}>
                <td>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => handleCheckboxChange(task._id, e.target.checked)}
                  />
                </td>
                <td>{task.action_item}</td>
                <td>{new Date(task.start_datetime).toLocaleString()}</td>
                <td>{new Date(task.end_datetime).toLocaleString()}</td>
                <td>{task.sent ? 'Yes' : 'No'}</td>
                <td>
                  <a href={`/?task_id=${task._id}`} target="_blank" rel="noopener noreferrer">
                    <FontAwesomeIcon icon={faFileLines} />
                  </a>
                </td>
                <td>
                  <button onClick={() => handleDeleteTask(task._id)}>
                    <FontAwesomeIcon icon={faTrash} color="red" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 
      <button
        onClick={handleAddTask}
        style={{
          padding: '10px',
          marginTop: '20px',
          backgroundColor: '#0070f3',
          color: '#fff',
          border: 'none',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '300px',
          alignSelf: 'center'
        }}
      >
        Add Task
      </button>

      Mobile Optimized - Add Task Button */}

      <style jsx>{`
        .container {
          padding: 20px;
          max-width: 1200px;
          width: 90%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-top: 80px;
        }
        @media (max-width: 600px) {
          .container {
            width: 95%;
            padding: 10px;
          }
          .tabs button {
            padding: 8px;
            font-size: 14px;
          }
        }
        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          justify-content: center;
        }
        .transcript-display {
          margin-bottom: 30px;
          width: 100%;
          text-align: center;
        }
        .transcript-box {
          border: 1px solid #ddd;
          padding: 10px;
          margin-bottom: 10px;
          overflow: hidden;
          transition: max-height 0.3s ease-in-out;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .table-wrapper {
          width: 100%;
          overflow-x: auto;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th,
        td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }
      `}</style>
    </div>
  );
};

export default TranscriptTasksPage;