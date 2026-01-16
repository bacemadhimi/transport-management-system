using TransportManagementSystem.Entity;

namespace TransportManagementSystem.Models;

public static class TripStatusTransitions
{
    public static readonly Dictionary<TripStatus, List<TripStatus>> ValidTransitions = new()
    {
        [TripStatus.Planned] = new() { TripStatus.Chargement, TripStatus.Cancelled },
        [TripStatus.Chargement] = new() { TripStatus.Delivery, TripStatus.Cancelled },
        [TripStatus.Delivery] = new() { TripStatus.Receipt, TripStatus.Cancelled },
        [TripStatus.Receipt] = new() { }, // End state
        [TripStatus.Cancelled] = new() { } // End state
    };

    public static bool IsValidTransition(TripStatus current, TripStatus next)
    {
        return ValidTransitions.ContainsKey(current) &&
               ValidTransitions[current].Contains(next);
    }

    public static string GetStatusLabel(TripStatus status)
    {
        return status switch
        {
            TripStatus.Planned => "Planifié",
            TripStatus.Chargement => "Chargement",
            TripStatus.Delivery => "Livraison",
            TripStatus.Receipt => "Bon de livraison",
            TripStatus.Cancelled => "Annulé",
            _ => "Inconnu"
        };
    }
}
