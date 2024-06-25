const { ipcRenderer } = require('electron');

const roomList = document.getElementById('room-list');
const createRoomForm = document.getElementById('create-room-form');
const createRoomNameInput = document.getElementById('create-room-name');
const createRoomMessage = document.getElementById('create-room-message');

// Populate room list on initial load
ipcRenderer.invoke('getRooms').then((response) => {
    if (response.success) {
        const rooms = response.rooms;
        rooms.forEach(room => {
            addRoomToList(room.room_name);
        });
    } else {
        console.error('Failed to fetch rooms:', response.error);
    }
}).catch((error) => {
    console.error('Error fetching rooms:', error);
});

// Handle room creation form submission
createRoomForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const roomName = createRoomNameInput.value.trim();

    try {
        const { success, error } = await ipcRenderer.invoke('createRoom', roomName);

        if (success) {
            createRoomMessage.textContent = `Room "${roomName}" created successfully`;
            addRoomToList(roomName);
            createRoomNameInput.value = ''; // Clear input after successful creation
        } else {
            createRoomMessage.textContent = `Failed to create room: ${error}`;
        }
    } catch (error) {
        console.error('Error creating room:', error);
        createRoomMessage.textContent = 'Failed to create room. Please try again.';
    }
});

// Function to add a room to the room list
function addRoomToList(roomName) {
    const li = document.createElement('li');
    li.textContent = roomName;
    li.addEventListener('click', () => {
        // Handle click event to join the room (to be implemented)
        console.log(`Joining room: ${roomName}`);
    });
    roomList.appendChild(li);
}
