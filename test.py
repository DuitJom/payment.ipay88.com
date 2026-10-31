def kira_diskaun(harga, peratus):
    # Pengiraan diskaun
    total = harga - (harga * peratus / 100)
    return total

print(kira_diskaun(100, "sepuluh"))  # Ralat jenis data (string bukannya nombor)
