const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: "*" }
});

const players = {};

io.on('connection', (socket) => {
  console.log('Client verbunden:', socket.id);

  socket.on('register', (name) => {
    players[socket.id] = { name, team: null };
    console.log(name + ' registriert');
    io.emit('players', players);
  });

  socket.on('setTeam', (team) => {
    if (players[socket.id]) {
      players[socket.id].team = team;
      io.emit('players', players);
    }
  });

  socket.on('disconnect', () => {
    delete players[socket.id];
    io.emit('players', players);
  });
});

app.post('/setTeam', (req, res) => {
  const { player, team } = req.body;
  for (let id in players) {
    if (players[id].name === player) {
      players[id].team = team;
    }
  }
  io.emit('players', players);
  res.json({ success: true, message: player + ' ist jetzt im Team ' + team });
});

app.get('/getPlayers', (req, res) => {
  res.json(Object.values(players));
});

app.get('/status', (req, res) => {
  res.json({
    status: 'online',
    players: Object.values(players),
    count: Object.keys(players).length
  });
});

app.get('/getScript', (req, res) => {
  const script = `
local serverURL = "https://vexserver.onrender.com"

local player = game.Players.LocalPlayer
local playerName = player.Name

print("VexServer geladen fuer " .. playerName)

local function httpRequest(options)
    if request then
        return request(options)
    elseif syn and syn.request then
        return syn.request(options)
    elseif http_request then
        return http_request(options)
    else
        error("Kein HTTP-Request gefunden")
    end
end

function setTeam(teamName)
    local data = {
        player = playerName,
        team = teamName
    }
    
    local response = httpRequest({
        Url = serverURL .. "/setTeam",
        Method = "POST",
        Headers = {["Content-Type"] = "application/json"},
        Body = game:GetService("HttpService"):JSONEncode(data)
    })
    
    if response and response.StatusCode == 200 then
        local result = game:GetService("HttpService"):JSONDecode(response.Body)
        print(result.message)
    end
end

spawn(function()
    while true do
        local response = httpRequest({
            Url = serverURL .. "/getPlayers",
            Method = "GET"
        })
        
        if response and response.StatusCode == 200 then
            local data = game:GetService("HttpService"):JSONDecode(response.Body)
            
            for _, info in pairs(data) do
                local target = game.Players:FindFirstChild(info.name)
                if target and target.Character then
                    local head = target.Character:FindFirstChild("Head")
                    if head then
                        local bill = head:FindFirstChild("VexTeamTag")
                        if not bill then
                            bill = Instance.new("BillboardGui")
                            bill.Name = "VexTeamTag"
                            bill.Size = UDim2.new(0, 250, 0, 60)
                            bill.StudsOffset = Vector3.new(0, 3.5, 0)
                            bill.AlwaysOnTop = true
                            bill.Parent = head
                            
                            local label = Instance.new("TextLabel")
                            label.Name = "Label"
                            label.Size = UDim2.new(1, 0, 1, 0)
                            label.BackgroundTransparency = 1
                            label.TextColor3 = Color3.fromRGB(255, 255, 255)
                            label.TextScaled = true
                            label.Font = Enum.Font.Black
                            label.TextStrokeTransparency = 0.3
                            label.Parent = bill
                        end
                        
                        local teamText = info.team or "No Team"
                        local color = Color3.fromRGB(255, 255, 255)
                        
                        if info.team == "Vex" then
                            color = Color3.fromRGB(255, 0, 255)
                        elseif info.team == "Hacker" then
                            color = Color3.fromRGB(255, 0, 0)
                        elseif info.team == "Admin" then
                            color = Color3.fromRGB(0, 255, 0)
                        elseif info.team == "VIP" then
                            color = Color3.fromRGB(255, 215, 0)
                        elseif info.team == "Owner" then
                            color = Color3.fromRGB(255, 165, 0)
                        elseif info.team == "Mod" then
                            color = Color3.fromRGB(0, 150, 255)
                        end
                        
                        bill.Label.Text = "[" .. teamText .. "] " .. info.name
                        bill.Label.TextColor3 = color
                    end
                end
            end
        end
        
        task.wait(2)
    end
end)

print("VexServer Nametag System geladen")
print("Befehl: setTeam('Teamname')")
  `;
  
  res.send(script);
});

app.get('/', (req, res) => {
  res.send('VexServer laeuft. Verbundene Spieler: ' + Object.keys(players).length);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('VexServer laeuft auf Port ' + PORT);
});
