-- One-time preservation of the 24 photos already visible on the public site at source 73c1baa8.
-- Exact existing titles, subtitles, asset paths, layout classes and order; no new private media.
-- Tracked migration: never replay as a reset. Any nonempty target aborts without changing rows.
DO $$
BEGIN
  LOCK TABLE public.portfolio_projects IN SHARE ROW EXCLUSIVE MODE;
  IF EXISTS (SELECT 1 FROM public.portfolio_projects) THEN
    RAISE EXCEPTION 'Portfolio is not empty; import aborted to preserve existing publishing choices';
  END IF;
  INSERT INTO public.portfolio_projects(id,title,subtitle,cover_image_url,layout_class,sort_order,is_published,status)
  VALUES
    ('3870f9d4-ba79-505f-888e-48b627ea8b5f', 'Formula E', 'Motorsport', '/assets/portfolio/motorsport.jpg', 'wide', 0, true, 'published'),
    ('b146082c-af09-5e6a-8280-9ae394778c42', 'Tōdai-ji', 'Architecture', '/assets/portfolio/todaiji.jpg', 'tall', 1, true, 'published'),
    ('6b24bcf4-b742-5b44-bf85-f640a48cc925', 'Daylight', 'Portrait', '/assets/portfolio/portrait-studio.jpg', 'tall', 2, true, 'published'),
    ('faf62f03-b296-54ad-ba0b-1f75c9dafd83', 'Nara', 'Wildlife', '/assets/portfolio/nara-deer.jpg', 'square', 3, true, 'published'),
    ('9f186ae2-4e9c-5d04-9c21-5889dfbabbdd', 'Blue Room', 'Editorial', '/assets/portfolio/editorial-interior.jpg', 'wide', 4, true, 'published'),
    ('26684c5b-59ae-5b10-9f92-55d6a8e462c7', 'Nightfall', 'Portrait', '/assets/portfolio/night-portrait.jpg', 'tall', 5, true, 'published'),
    ('44afc0e0-007a-52fa-b7c7-d787a8d0ba6c', 'Low Key', 'Portrait', '/assets/portfolio/portrait-low-key.jpg', 'tall', 6, true, 'published'),
    ('526e57d7-d837-575d-bcf8-7ba2671f975d', 'Platform', 'Street', '/assets/portfolio/platform.jpg', 'tall', 7, true, 'published'),
    ('03e38d56-2c1a-5363-9f9f-3939f7c63148', 'Sobremesa', 'Documentary', '/assets/portfolio/documentary.jpg', 'tall', 8, true, 'published'),
    ('abb10799-4a53-5713-93be-e338fafea47a', 'Temple Gate', 'Street', '/assets/portfolio/temple-gate.jpg', 'tall', 9, true, 'published'),
    ('00998a53-0d5e-5933-b834-b9cab97b4dad', 'Offering', 'Documentary', '/assets/portfolio/incense.jpg', 'tall', 10, true, 'published'),
    ('a125599f-db61-5064-af92-83e599677db3', 'Five Storeys', 'Architecture', '/assets/portfolio/pagoda.jpg', 'tall', 11, true, 'published'),
    ('800a4f1f-2352-50ce-90ff-97dc69c0b166', 'Gate Tower', 'Architecture', '/assets/portfolio/gate-tower.jpg', 'tall', 12, true, 'published'),
    ('38092c5a-a2be-50e3-8962-4588d5a266bd', 'Roadside', 'Street', '/assets/portfolio/roadside.jpg', 'tall', 13, true, 'published'),
    ('983760c5-99e0-5673-8c8c-54092c5a89aa', 'Namba Yasaka', 'Architecture', '/assets/portfolio/namba-yasaka.jpg', 'square', 14, true, 'published'),
    ('71da50da-75d6-518a-b308-37fe13193af7', 'Ginza', 'Motorsport', '/assets/portfolio/ginza-nissan.jpg', 'wide', 15, true, 'published'),
    ('ca05434b-048f-5ed9-8409-885d4be112b0', 'Tokyo Tower', 'Architecture', '/assets/portfolio/tokyo-tower.jpg', 'tall', 16, true, 'published'),
    ('0fe8bea0-778e-59ce-bb7d-52c21062a480', 'Halo', 'Motorsport', '/assets/portfolio/halo-detail.jpg', 'wide', 17, true, 'published'),
    ('94afa99c-40bd-5b1b-9e1f-52a693286e49', 'Last Train', 'Street', '/assets/portfolio/last-train.jpg', 'tall', 18, true, 'published'),
    ('fc1400d9-7c52-563e-94a6-7193a89dac5a', 'Shibuya', 'Street', '/assets/portfolio/shibuya.jpg', 'tall', 19, true, 'published'),
    ('eb87e1cb-31ef-5eb2-93ae-694817cf723b', 'Cheers', 'Nightlife', '/assets/portfolio/nightlife-cheers.jpg', 'wide', 20, true, 'published'),
    ('2e8a30cc-407d-5d18-98b9-d9c81ba48d81', 'The Crew', 'Nightlife', '/assets/portfolio/nightlife-crew.jpg', 'wide', 21, true, 'published'),
    ('201feaa0-cec3-55b8-822f-304289049046', 'Crossing', 'Motorsport', '/assets/portfolio/nissan-crossing.jpg', 'wide', 22, true, 'published'),
    ('d5e624b4-117c-5803-a24f-cd3fd21341a4', 'Itaewon', 'Street', '/assets/portfolio/itaewon.jpg', 'tall', 23, true, 'published');
END;
$$;
