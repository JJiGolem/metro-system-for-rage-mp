using System;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;
using GTANetworkAPI;
using GolemoSDK;

namespace Golemo.Buildings
{
    class MetroSystem : Script
    {
        private readonly static List<MetroRoute> _routes;
        private const int TicketPrice = 500;

        [ServerEvent(Event.ResourceStart)]
        public void ResourceStart()
        {
            try
            {
                _routes = new List<MetroRoute>()
                {
                    new MetroRoute(1, new List<MetroStation>()
                    {
                        new MetroStation(1, "LSIA Terminal", new Vector3(-1089.08, -2722.46, -8), new Vector3(-1080.33, -2723.51, -9.42), new Vector3(-1091.47, -2713.67, -9.42)),
                        new MetroStation(2, "LSIA Parking", new Vector3(-871.58, -2292.60, -12), new Vector3(-867.76, -2297.91, -13.75), new Vector3(-882.04, -2292.92, -13.75)),
                        new MetroStation(3, "Puerto Del Sol", new Vector3(-534.58, -1272.25, 27), new Vector3(-533.88, -1279.40, 24.78), new Vector3(-542.53, -1275.31, 24.78)),
                        new MetroStation(4, "Strawberry", new Vector3(278.71, -1205.81, 38), new Vector3(277.61, -1210.10, 36.95), new Vector3(279.32, -1198.60, 36.95)),
                        new MetroStation(5, "Burton", new Vector3(-291.53, -318.96, 9), new Vector3(-287.01, -319.07, 8.06), new Vector3(-302.09, -318.65, 8.06)),
                        new MetroStation(6, "Portola Drive", new Vector3(-817.60, -139.27, 19), new Vector3(-818.40, -130.52, 17.93), new Vector3(-810.50, -143.64, 17.93)),
                        new MetroStation(7, "Del Perro", new Vector3(-1350.61, -466.92, 14), new Vector3(-1358.88, -466.93, 13.03), new Vector3(-1345.65, -459.87, 13.03)),
                        new MetroStation(8, "Little Seoul", new Vector3(-498.40, -673.42, 11), new Vector3(-502.36, -680.68, 9.79), new Vector3(-502.59, -665.63, 9.79)),
                        new MetroStation(9, "Pillbox South", new Vector3(-213.49, -1030.22, 29), new Vector3(-217.25, -1030.57, 28.20), new Vector3(-208.98, -1035.07, 28.20)),
                        new MetroStation(10, "Davis", new Vector3(111.75, -1724.17, 29), new Vector3(111.31, -1727.83, 27.93), new Vector3(118.89, -1723.10, 28))
                    }),
                };
            }
            catch (Exception e)
            {
                Console.WriteLine($"Metro_ResourceStart: {e}");
            }
        }

        public static void InteractionPressed(Player player)
        {
            try
            {
                if (Main.Players.ContainsKey(player) == false) return;
                if (player.HasData(nameof(MetroStation)) == false) return;

                MetroStation station = player.GetData<MetroStation>(nameof(MetroStation));
                if (station == null) return;

                MetroRoute route = _routes.Find(x => x.Stations.First(x => x == station) != null);
                if (route == null) return;
                
                player.TriggerClientEvent("metro::open_menu", TicketPrice, station.Id, route.Id, JsonConvert.SerializeObject(route.Stations));
            }
            catch (Exception e)
            {
                Console.WriteLine($"Metro_InteractionPressed: {e}");
            }
        }

        [RemoteEvent("metro::buy_ticket")]
        public static void buyTicket_Server(Player player, int stationId)
        {
            try
            {
                if (Main.Players.ContainsKey(player) == false) return;
                if (player.HasData(nameof(MetroStation)) == false) return;

                MetroStation station = player.GetData<MetroStation>(nameof(MetroStation));
                if (station == null) return;
                
                if (Main.Players[player].Money < TicketPrice)
                {
                    Notify.Error(player, "У вас недостаточно денег");
                    return;
                }
                if (station.Id == stationId)
                {
                    Notify.Error(player, "Вы уже находитесь на этой станции");
                    return;
                }

                MetroRoute route = _routes.Find(x => x.Stations.FirstOrDefault(x => x == station) != null);
                if (route == null) return;
                
                MetroStation wStation = route.Stations.FirstOrDefault(x => x.Id == stationId);
                if (wStation == null)
                {
                    Notify.Error(player, "Попробуйте снова!");
                    return;
                }

                int aIndex = route.Stations.FindIndex(x => x == station);
                int wIndex = route.Stations.FindIndex(x => x == wStation);
                station.SpawnTrain(player, wStation, aIndex > wIndex);
                
                MoneySystem.Wallet.Change(player, -TicketPrice);
            }
            catch (Exception e)
            {
                Console.WriteLine($"Metro_BuyTicket: {e}");
            }
        }

        [RemoteEvent("metro::race_finish")]
        public void MetroRaceFinish(Player player)
        {
            Core.Dimensions.DismissPrivateDimension(player);
            NAPI.Entity.SetEntityDimension(player, 0);
        }

        private class MetroRoute
        {
            public int Id { get; }
            public List<MetroStation> Stations { get; };

            public MetroRoute(int id, List<MetroStation> stations)
            {
                Id = id;
                Stations = stations;
            }
        }

        private class MetroStation
        {
            public int Id { get; }
            public string Name { get; }

            [JsonIgnore]
            public Vector3 Position { get; }

            [JsonIgnore]
            private List<Vector3> _trainSpawnPositions { get; }

            public MetroStation(int id, string name, Vector3 shapePosition, Vector3 spawnPosition1, Vector3 spawnPosition2)
            {
                Id = id;
                Name = name;

                Position = shapePosition;

                _trainSpawnPositions = new List<Vector3>(2)
                {
                    spawnPosition1, spawnPosition2
                };

                GreateGTAElements();
            }

            public void SpawnTrain(Player player, MetroStation station, bool forward)
            {
                uint privateDimension = Core.Dimensions.RequestPrivateDimension(player);
                NAPI.Entity.SetEntityDimension(player, privateDimension);

                Vector3 spawnPos = GetTrainSpawnPositionWithForwardMove(forward);
                Vector3 pointPos = station.GetTrainSpawnPositionWithForwardMove(forward);
                player.TriggerClientEvent("metro::start_race", spawnPos, pointPos, station.Position, privateDimension);
            }

            public Vector3 GetTrainSpawnPositionWithForwardMove(bool forward)
            {
                try
                {
                    return _trainSpawnPositions[forward ? 1 : 0];
                }
                catch (Exception e)
                {
                    Console.WriteLine($"Metro_GetTrainSpawnPosition: {e}");
                    return Position;
                }
            }


            [JsonIgnore]
            private Blip _blip;
            [JsonIgnore]
            private ColShape _shape;
            [JsonIgnore]
            private Marker _marker;

            private void GreateGTAElements()
            {
                _blip = NAPI.Blip.CreateBlip(795, Position, 0.5f, 47, Name, 255, 0, true, 0, 0);
                _marker = NAPI.Marker.CreateMarker(1, Position, new Vector3(), new Vector3(), 1f, new Color(255, 0, 255, 120), false, 0);
                _shape = NAPI.ColShape.CreateCylinderColShape(Position, 1f, 2f, 0);
                _shape.OnEntityEnterColShape += (s, e) =>
                {
                    e.SetData("INTERACTIONCHECK", 817);
                    e.SetData(nameof(MetroStation), this);
                };
                _shape.OnEntityExitColShape += (s, e) =>
                {
                    e.SetData("INTERACTIONCHECK", 0);
                    e.ResetData(nameof(MetroStation));
                };
            }
        }
    }
}
