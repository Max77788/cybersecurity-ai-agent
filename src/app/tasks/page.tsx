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

const TranscriptTasksPage = () => {
  // transcripts come from the API (allTranscripts)
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  // selectedTranscript will be one of the transcript objects
  const [selectedTranscript, setSelectedTranscript] = useState<Transcript | null>(null);
  // tasks is a mapping from transcript _id to an array of task objects
  const [tasks, setTasks] = useState({});
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

  // When the selected transcript changes, fetch its tasks from /api/data/find-tasks-by-id
  useEffect(() => {
    if (selectedTranscript) {
      const taskIds = selectedTranscript?.idsOfInsertedTasks || [];
      // If no task IDs exist, set an empty array for this transcript.
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
            // Now using the tasks_to_return property from the response.
            setTasks((prev) => ({ ...prev, [selectedTranscript._id]: data.tasks_to_return }));
          })
          .catch((err) => console.error('Error fetching tasks:', err));
      }
    }
  }, [selectedTranscript]);

  // Update a task by sending a request to the API
  const updateTask = (updatedTask) => {
    fetch('/api/data/updateTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedTask),
    })
      .then((res) => res.json())
      .then((result) => console.log('Task updated:', result))
      .catch((err) => console.error('Error updating task:', err));
  };

  // When a task checkbox is toggled, update its completion status
  const handleCheckboxChange = (taskId, checked) => {
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

  // Add a new task: update local state and call /api/data/addTask
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

    // Update the tasks state for this transcript
    const updatedTasksForTranscript = [...(tasks[transcriptId] || []), newTask];
    setTasks({ ...tasks, [transcriptId]: updatedTasksForTranscript });

    // Also update the transcript's idsOfInsertedTasks locally
    const updatedTranscripts = transcripts.map((t) => {
      if (t._id === transcriptId) {
        return { ...t, idsOfInsertedTasks: [...(t.idsOfInsertedTasks || []), newTask._id] };
      }
      return t;
    });
    setTranscripts(updatedTranscripts);

    // Send the new task to the backend
    fetch('/api/data/addTask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    })
      .then((res) => res.json())
      .then((result) => console.log('Task added:', result))
      .catch((err) => console.error('Error adding task:', err));
  };

  // Delete a task: update state and call /api/data/deleteTask
  const handleDeleteTask = (taskId: any) => {
    if (!confirm("Are You Sure You Want to Delete?")) return;

    if (!selectedTranscript) return;
    const transcriptId = selectedTranscript._id;
    const updatedTasksForTranscript = (tasks[transcriptId] || []).filter((task) => task._id !== taskId);
    setTasks({ ...tasks, [transcriptId]: updatedTasksForTranscript });

    // Also update the transcript's idsOfInsertedTasks locally
    const updatedTranscripts = transcripts.map((t) => {
      if (t._id === transcriptId) {
        return { ...t, idsOfInsertedTasks: (t.idsOfInsertedTasks || []).filter((id) => id !== taskId) };
      }
      return t;
    });
    setTranscripts(updatedTranscripts);

    // Send the delete request to the backend
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
    return null;
    // return <div>Loading...</div>;
  }

  // Get tasks for the selected transcript
  const tasksForTranscript = tasks[selectedTranscript._id] || [];
  const maxLength = 100;
  const transcriptText = selectedTranscript.transcript;
  const displayTranscript =
    showFullTranscript || transcriptText.length <= maxLength
      ? transcriptText
      : transcriptText.slice(0, maxLength) + '...';

  return (
    <div
      style={{
        padding: '20px',
        maxWidth: '1200px',
        width: '90%',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}
    >
      {/* Transcript Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
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
            {new Date(t.dateAdded).toLocaleDateString()} (
            {(t.idsOfInsertedTasks || []).length} tasks)
          </button>
        ))}
      </div>

      {/* Transcript Display */}
      <div style={{ marginBottom: '30px', width: '90%', textAlign: 'center' }}>
        <h2 className="text-3xl text-center mb-2">Transcript</h2>
        <p className="border p-2 mb-2">{displayTranscript}</p>
        {transcriptText.length > maxLength && (
          <button onClick={() => setShowFullTranscript(!showFullTranscript)}>
            {showFullTranscript ? '^ Show Less ^' : 'v Show More v'}
          </button>
        )}
      </div>

      {/* Tasks Table */}
      <div className="text-center flex justify-center items-center" style={{ width: '100%' }}>
        <table style={{ width: '90%', borderCollapse: 'collapse', margin: '0 auto' }}>
          <thead>
            <tr>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Done</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Action Item</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Start</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>End</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Reminded</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Chat</th>
              <th style={{ border: '1px solid #ddd', padding: '8px' }}>Delete</th>
            </tr>
          </thead>
          <tbody>
            {tasksForTranscript.map((task) => (
              <tr key={task._id}>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={(e) => handleCheckboxChange(task._id, e.target.checked)}
                  />
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>{task.action_item}</td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {new Date(task.start_datetime).toLocaleString()}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {new Date(task.end_datetime).toLocaleString()}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  {task.sent ? 'Yes' : 'No'}
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px' }}>
                  <a href={`/?task_id=${task._id.toString()}`} target="_blank">
                    <FontAwesomeIcon icon={faFileLines} />
                  </a>
                </td>
                <td style={{ border: '1px solid #ddd', padding: '8px', textAlign: 'center' }}>
                  <button onClick={() => handleDeleteTask(task._id)}>
                    <FontAwesomeIcon icon={faTrash} color="red" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TranscriptTasksPage;
